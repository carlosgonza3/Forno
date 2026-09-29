const MAX_INVENTORY_QUANTITY = 99999999999.999;
const LAST_BEVERAGE_ERROR_KEY = "forno:last-beverage-inventory-error";

function diagnosticReport({classification, error, editedItems, userRole, source}) {
    return {
        capturedAt: new Date().toISOString(),
        operation: "beverage_inventory_update",
        source,
        classification,
        accountRole: userRole || "unknown",
        database: error ? {
            code: error.code ?? null,
            message: error.message ?? null,
            details: error.details ?? null,
            hint: error.hint ?? null,
        } : null,
        items: editedItems.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku || null,
            active: item.active,
            previousQuantity: Number(item.quantity),
            submittedQuantity: item.newQuantity,
            noteLength: item.note?.length ?? 0,
        })),
    };
}

export function rememberBeverageDiagnostic(reportText) {
    try {
        window.sessionStorage.setItem(LAST_BEVERAGE_ERROR_KEY, reportText);
    } catch {
        // The visible and copyable diagnostic remains available if storage is blocked.
    }
}

export function beverageExistenceError(error, editedItems, userRole) {
    const databaseMessage = String(error?.message ?? "").trim();
    const normalizedMessage = databaseMessage.toLocaleLowerCase("es");
    let cause = "La base de datos rechazó la actualización sin identificar una bebida específica.";
    let classification = "UNKNOWN_DATABASE_ERROR";

    if (error?.code === "22023") {
        if (normalizedMessage.includes("must change the current quantity")) {
            classification = "STALE_OR_ALREADY_CURRENT_QUANTITY";
            cause = "Al menos una bebida ya tiene en la base de datos la misma existencia que intentaste guardar. "
                + "Esto puede ocurrir si el inventario cambió después de abrir esta pantalla.";
        } else if (normalizedMessage.includes("zero or greater")) {
            classification = "INVALID_QUANTITY";
            cause = "Al menos una existencia está vacía, no es numérica o es menor que cero.";
        } else if (normalizedMessage.includes("valid item and quantity")) {
            classification = "INVALID_ITEM_OR_QUANTITY";
            cause = "Al menos una bebida tiene un identificador o una cantidad que la base de datos no reconoce como válida.";
        } else if (normalizedMessage.includes("notes cannot exceed")) {
            classification = "NOTE_TOO_LONG";
            cause = "Al menos una nota supera el límite de 500 caracteres.";
        } else if (normalizedMessage.includes("between 1 and 500")) {
            classification = "INVALID_BATCH_SIZE";
            cause = "La solicitud no contiene entre 1 y 500 bebidas modificadas.";
        } else {
            classification = "INVALID_DATABASE_VALUE";
            cause = "La base de datos clasificó como inválido uno de los valores enviados.";
        }
    } else if (error?.code === "P0002") {
        classification = "ITEM_INACTIVE_OR_MISSING";
        cause = "Al menos una bebida fue desactivada, eliminada o dejó de estar disponible después de abrir esta pantalla.";
    } else if (error?.code === "42501") {
        classification = "PERMISSION_DENIED";
        cause = "La cuenta actual no tiene permiso para registrar esta actualización de existencias.";
    } else if (error?.code === "23514") {
        classification = "NEGATIVE_QUANTITY";
        cause = "La actualización dejaría al menos una existencia por debajo de cero.";
    }

    const identifiedItems = editedItems.filter((item) => [item.id, item.name, item.sku]
        .filter(Boolean)
        .some((identifier) => normalizedMessage.includes(String(identifier).toLocaleLowerCase("es"))));
    const affectedItems = identifiedItems.length ? identifiedItems : editedItems;
    const technicalParts = [
        error?.code && `Código: ${error.code}`,
        databaseMessage && `Mensaje: ${databaseMessage}`,
        error?.details && `Detalle: ${error.details}`,
        error?.hint && `Sugerencia: ${error.hint}`,
    ].filter(Boolean);
    const report = diagnosticReport({
        classification, error, editedItems, userRole, source: "database",
    });

    return {
        summary: editedItems.length === 1
            ? "No se pudo actualizar la bebida."
            : "No se pudieron actualizar las bebidas.",
        cause,
        technical: technicalParts.join(" · ") || "La base de datos no devolvió detalles técnicos.",
        affectedItemIds: new Set(affectedItems.map((item) => item.id)),
        rowExplanation: identifiedItems.length > 0
            ? "La fila identificada por la base de datos está resaltada."
            : "La base de datos no indicó cuál bebida falló; se resaltaron todas las bebidas enviadas.",
        reportText: JSON.stringify(report, null, 2),
    };
}

export function beveragePreflightError(editedItems, userRole) {
    const seenIds = new Set();
    const failures = [];
    for (const item of editedItems) {
        let reason = "";
        if (!item.id) reason = "La bebida no tiene un identificador.";
        else if (seenIds.has(item.id)) reason = "La bebida aparece más de una vez en la solicitud.";
        else if (!item.active) reason = "La bebida está inactiva.";
        else if (!Number.isFinite(item.newQuantity)) reason = "La existencia no es un número válido.";
        else if (item.newQuantity < 0) reason = "La existencia no puede ser negativa.";
        else if (item.newQuantity > MAX_INVENTORY_QUANTITY) {
            reason = `La existencia excede el máximo permitido (${MAX_INVENTORY_QUANTITY.toLocaleString("es-SV")}).`;
        } else if (Math.abs(item.newQuantity * 1000 - Math.round(item.newQuantity * 1000)) > Number.EPSILON) {
            reason = "La existencia no puede tener más de tres decimales.";
        } else if (item.note.length > 500) reason = "La nota supera el límite de 500 caracteres.";
        else if (item.newQuantity === Number(item.quantity)) reason = "La nueva existencia es igual a la existencia cargada.";
        if (reason) failures.push({id: item.id, name: item.name, reason});
        if (item.id) seenIds.add(item.id);
    }
    if (!editedItems.length || editedItems.length > 500) {
        failures.push({id: null, name: "Solicitud", reason: "Debe contener entre 1 y 500 bebidas."});
    }
    if (!failures.length) return null;

    const report = diagnosticReport({
        classification: "LOCAL_PREFLIGHT_VALIDATION",
        error: null,
        editedItems,
        userRole,
        source: "frontend_preflight",
    });
    report.failures = failures;
    return {
        summary: "La solicitud no se envió porque contiene datos inválidos.",
        cause: failures.map((failure) => `${failure.name}: ${failure.reason}`).join(" "),
        technical: "Validación local: no se realizó ninguna operación en la base de datos.",
        affectedItemIds: new Set(failures.map((failure) => failure.id).filter(Boolean)),
        rowExplanation: "La validación local identificó y resaltó las bebidas que debes revisar.",
        reportText: JSON.stringify(report, null, 2),
    };
}
