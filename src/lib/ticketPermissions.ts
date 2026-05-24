// src/lib/ticketPermissions.ts
export type TicketAction = 'ASSIGN' | 'FORWARD' | 'HANDBACK' | 'CLOSE' | 'REOPEN' | 'REPLY' | 'CREATE' | 'PROCESSING'

export function canPerform(action: TicketAction, role: string, subGroup: string | null): boolean {
  if (role === 'management') return true
  
  // Basic universal actions
  if (action === 'CREATE') return true
  if (action === 'REPLY') return true
  if (action === 'REOPEN') return true
  
  // Staff role actions
  const isStaff = role === 'staff'
  if (isStaff) {
    if (action === 'FORWARD') return true
    if (action === 'HANDBACK') return true
    if (action === 'PROCESSING') return true
    if (action === 'CLOSE') return true // Staff can close
  }

  // Supervisor actions
  if (action === 'ASSIGN' && subGroup?.endsWith('_SUP')) return true
  
  return false
}
