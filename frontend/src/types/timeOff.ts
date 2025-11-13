/**
 * Time-off related types
 */

export interface EmployeeTimeOff {
  id: number;
  employee_id: number;
  business_id: number;
  time_off_type: 'holiday' | 'sick_leave' | 'personal_day' | 'vacation';
  start_date: string;
  end_date: string;
  is_full_day: boolean;
  half_day_period?: 'AM' | 'PM';
  is_recurring: boolean;
  recurrence_pattern?: { [key: string]: any };
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by?: number;
  approved_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  employee_email?: string;
  requester_name?: string;
  approver_name?: string;
}

export interface TimeOffCreate {
  employee_id: number;
  business_id: number;
  time_off_type: 'holiday' | 'sick_leave' | 'personal_day' | 'vacation';
  start_date: string;
  end_date: string;
  is_full_day: boolean;
  half_day_period?: 'AM' | 'PM';
  is_recurring: boolean;
  recurrence_pattern?: { [key: string]: any };
  notes?: string;
}

export interface TimeOffUpdate {
  time_off_type?: 'holiday' | 'sick_leave' | 'personal_day' | 'vacation';
  start_date?: string;
  end_date?: string;
  is_full_day?: boolean;
  half_day_period?: 'AM' | 'PM';
  is_recurring?: boolean;
  recurrence_pattern?: { [key: string]: any };
  notes?: string;
}

export interface TimeOffStatusUpdate {
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  notes?: string;
  updated_at?: string;
}

