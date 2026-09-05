"use client";

// Privacy: business isolation is a core guarantee. The previous
// super-admin OrgSwitcher banner ("Super-admin ... You see all orgs.")
// exposed cross-tenant context and the legacy tenant name in the top bar.
// Per privacy feedback this UI is removed entirely. The Businesses admin
// page remains the privileged surface for org management.
// This component is kept as a no-op to avoid breaking imports.
export default function OrgSwitcher() {
  return null;
}
