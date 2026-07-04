# Synthetic Access Control Evidence

These files are synthetic and safe to use for demos.

Use them with the app's `Cybersecurity Access` domain:

- `access_control_compliant_q1_2026.csv` should produce a mostly passing result.
- `access_control_mfa_exceptions_q1_2026.csv` should flag active users with `MFA Enabled = FALSE`.
- `access_control_unstructured_exception_q1_2026.txt` should exercise the unstructured narrative path and flag an MFA exception.

Suggested app flow:

1. Open the Sandbox tab.
2. Select `Cybersecurity Access`.
3. Upload one of these files or paste its contents into the evidence input.
4. Run validation.
5. Review the validation output and AI auditor guidance.
