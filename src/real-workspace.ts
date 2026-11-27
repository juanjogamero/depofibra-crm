import type { CrmState } from './domain';
import { request } from '../secure/api';

export type RealIdentity = { username: string; role: 'direccion' | 'oficina' };
export type WorkspaceResponse = { version: number; state: CrmState };

export const emptyRealState = (): CrmState => ({
  opportunities: [], quotes: [], customers: [], orders: [],
  tasks: [], products: [], productCategories: [], commissionPayments: [],
  orderAlerts: [], internalNotes: [],
  transport: { smallRate: 0, largeRate: 0, buffer: 0, distanceLimit: 0, specialExtra: 0 }
});

export function validateLoadedState(payload: unknown): WorkspaceResponse {
  if (!payload || typeof payload !== 'object') throw new Error('Respuesta inválida del servidor');
  const candidate = payload as Partial<WorkspaceResponse>;
  const state = candidate.state;
  if (!Number.isSafeInteger(candidate.version) || (candidate.version as number) < 0
      || !state || typeof state !== 'object' || Array.isArray(state)
      || !Array.isArray(state.opportunities) || !Array.isArray(state.quotes)
      || !Array.isArray(state.customers) || !Array.isArray(state.orders)
      || !Array.isArray(state.tasks) || !Array.isArray(state.products)
      || !state.transport || typeof state.transport !== 'object') {
    throw new Error('El estado real del CRM no tiene la estructura esperada');
  }
  return {
    version: candidate.version as number,
    state: {
      ...emptyRealState(),
      ...state,
      productCategories: state.productCategories ?? [],
      commissionPayments: state.commissionPayments ?? [],
      orderAlerts: state.orderAlerts ?? [],
      internalNotes: state.internalNotes ?? []
    }
  };
}

export async function loadRealWorkspace(): Promise<WorkspaceResponse> {
  return validateLoadedState(await request<unknown>('/api/workspace'));
}

export async function saveRealWorkspace(
  version: number, state: CrmState
): Promise<number> {
  const response = await request<{ version: number }>('/api/workspace', {
    method: 'PUT', body: JSON.stringify({ version, state })
  });
  if (!Number.isSafeInteger(response.version) || response.version !== version + 1) {
    throw new Error('Versión inesperada al guardar');
  }
  return response.version;
}
