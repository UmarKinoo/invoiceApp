import { findClientTool } from './clients'
import { createInvoiceTool } from './invoices'
import { findInvoiceTool, getInvoiceTool, updateInvoiceStatusTool } from './invoice-tools'
import { getLedgerSummaryTool } from './ledger'
import { askHumanTool } from './utilities'

export const tools = [
  findClientTool,
  findInvoiceTool,
  getInvoiceTool,
  getLedgerSummaryTool,
  createInvoiceTool,
  updateInvoiceStatusTool,
  askHumanTool,
] as const

export type AgentTool = (typeof tools)[number]
