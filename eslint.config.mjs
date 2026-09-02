import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"] },
  ...nextVitals,
  ...nextTs,
  {
    // The React-Compiler-era hook rules flag long-standing patterns in the
    // inherited estimator components (focus-local input state, latest-value
    // refs). Those components are deliberately untouched, so these stay
    // warnings; new code is written to satisfy them.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default config;
