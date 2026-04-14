export interface TechSupportTicket {
  rowIndex: number;
  timestamp: string;
  email: string;
  name: string;
  contactNo: string;
  batchNo: string;
  domain: string;
  module: string;
  description: string;
  audio?: string;
  assignedTo: string;
  firstCallTime: string;
  firstCallStatus: string;
  firstCallRecordingLink?: string;
  firstCallRemarks?: string;
  dateOfSecondCall: string;
  secondCallTime?: string;
  secondCallStatus: string;
  secondCallRecordingLink?: string;
  secondCallRemarks?: string;
}
