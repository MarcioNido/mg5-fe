let tenantGeneration = 0;
const activeTenantRequests = new Set<AbortController>();

export function beginTenantRequest(externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const generation = tenantGeneration;

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  activeTenantRequests.add(controller);
  return {
    generation,
    signal: controller.signal,
    finish: () => activeTenantRequests.delete(controller),
  };
}

export function invalidateTenantRequests() {
  tenantGeneration += 1;
  activeTenantRequests.forEach((controller) => controller.abort());
  activeTenantRequests.clear();
}

export function isCurrentTenantGeneration(generation: number) {
  return generation === tenantGeneration;
}
