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

  return (
    <div className="relative">
      <Select
        value={selectedEmployeeId?.toString() || ''}
        onValueChange={(value) => onEmployeeChange(value ? Number(value) : null)}
        disabled={disabled}
      >
        <SelectTrigger className="block w-full pl-10 pr-10 py-2 text-base border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <UserIcon className="h-5 w-5 text-gray-400" />
          </div>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 border-gray-600">
          {allowNone && (
            <SelectItem value="" className="text-white hover:bg-gray-600">
              No employee assigned
            </SelectItem>
          )}
          {activeEmployees.map((employee) => (
            <SelectItem 
              key={employee.id} 
              value={employee.id.toString()}
              className="text-white hover:bg-gray-600"
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
