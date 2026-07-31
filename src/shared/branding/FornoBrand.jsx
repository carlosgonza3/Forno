import NicoWineWhite from "../../assets/nico-whine-white.png";

export function FornoFox({ size = 38 }) {
  return (
    <img
      src={NicoWineWhite}
      className="forno-fox"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}

export default function FornoBrand() {
  return (
    <div className="logo-wrap">
      <div className="logo-mark"><FornoFox /></div>
      <div>
        <div className="logo-name">FORNO</div>
        <div className="logo-sub">San Benito, SV</div>
      </div>
    </div>
  );
}
