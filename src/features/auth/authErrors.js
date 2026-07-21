export function getPasswordResetErrorMessage(error) {
  switch (error?.code) {
    case "email_address_not_authorized":
      return "Este correo no está autorizado por el servicio de prueba de Supabase. Agrégalo al equipo del proyecto o configura SMTP propio.";
    case "over_email_send_rate_limit":
      return "Se alcanzó el límite temporal de correos de Supabase. Espera antes de solicitar otro enlace.";
    case "over_request_rate_limit":
      return "Se hicieron demasiadas solicitudes. Espera unos minutos e intenta nuevamente.";
    case "email_address_invalid":
      return "El proveedor rechazó el formato o dominio del correo electrónico.";
    case "email_provider_disabled":
      return "El envío por correo está desactivado en la configuración de Supabase Auth.";
    case "request_timeout":
      return "El servicio de correo tardó demasiado en responder. Intenta nuevamente.";
    default:
      return "No pudimos enviar el enlace. Revisa Auth Logs en Supabase para conocer el motivo.";
  }
}
