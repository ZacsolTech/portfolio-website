import React from "react";

export function Logo() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="zacsol-admin-logo zacsol-admin-logo--dark"
        src="/brand/logo-on-dark.png"
        alt="ZACSOL"
        width={168}
        height={48}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="zacsol-admin-logo zacsol-admin-logo--light"
        src="/brand/logo.png"
        alt="ZACSOL"
        width={168}
        height={48}
      />
    </>
  );
}
