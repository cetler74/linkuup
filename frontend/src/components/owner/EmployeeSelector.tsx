import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: number;
  name: string;
  role: string;
  is_active: boolean;
}

interface EmployeeSelectorProps {
  employees: Employee[];
  selectedEmployeeId?: number;
  onEmployeeChange: (employeeId: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowNone?: boolean;
}

const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  employees,
  selectedEmployeeId,
  onEmployeeChange,
  placeholder = "Select an employee",
  disabled = false,
  allowNone = true
}) => {
  const activeEmployees = employees.filter(emp => emp.is_active);
  const selectedEmployee = selectedEmployeeId 
    ? activeEmployees.find(emp => emp.id === selectedEmployeeId)
    : null;

  return (
    <div className="relative">
      <Select
        value={selectedEmployeeId?.toString() || ''}
        onValueChange={(value) => onEmployeeChange(value ? Number(value) : null)}
        disabled={disabled}
      >
        <SelectTrigger className="block w-full pl-10 pr-10" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <UserIcon className="h-5 w-5 text-[#9E9E9E]" />
          </div>
          <span className="flex-1 text-left">
            {selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.role})` : placeholder}
          </span>
        </SelectTrigger>
        <SelectContent>
          {allowNone && (
            <SelectItem value="" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              No employee assigned
            </SelectItem>
          )}
          {activeEmployees.map((employee) => (
            <SelectItem 
              key={employee.id} 
              value={employee.id.toString()}
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              {employee.name} ({employee.role})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default EmployeeSelector;
