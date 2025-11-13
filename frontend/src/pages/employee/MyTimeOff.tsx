import React, { useState } from 'react';
import { 
  CalendarIcon, 
  PlusIcon, 
  TrashIcon, 
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { EmployeeTimeOff, TimeOffCreate } from '../../utils/ownerApi';

interface MyTimeOffProps {
  currentUser: {
    id: number;
    name: string;
    email: string;
  };
}

const MyTimeOff: React.FC<MyTimeOffProps> = ({ currentUser }) => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTimeOff, setSelectedTimeOff] = useState<EmployeeTimeOff | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Mock data - in real implementation, this would come from API
  const [timeOffEntries, setTimeOffEntries] = useState<EmployeeTimeOff[]>([
    {
      id: 1,
      employee_id: currentUser.id,
      business_id: 1,
      time_off_type: 'vacation',
      start_date: '2024-12-20',
      end_date: '2024-12-27',
      is_full_day: true,
      half_day_period: undefined,
      is_recurring: false,
      recurrence_pattern: null,
      status: 'approved',
      requested_by: currentUser.id,
      approved_by: 1,
      notes: 'Family vacation',
      created_at: '2024-11-15T10:00:00Z',
      updated_at: '2024-11-15T10:00:00Z',
      employee_name: currentUser.name,
      employee_email: currentUser.email,
      requester_name: currentUser.name,
      approver_name: 'Business Owner'
    },
    {
      id: 2,
      employee_id: currentUser.id,
      business_id: 1,
      time_off_type: 'personal_day',
      start_date: '2024-12-10',
      end_date: '2024-12-10',
      is_full_day: false,
      half_day_period: 'AM',
      is_recurring: false,
      recurrence_pattern: null,
      status: 'pending',
      requested_by: currentUser.id,
      approved_by: null,
      notes: 'Doctor appointment',
      created_at: '2024-12-01T14:30:00Z',
      updated_at: '2024-12-01T14:30:00Z',
      employee_name: currentUser.name,
      employee_email: currentUser.email,
      requester_name: currentUser.name,
      approver_name: null
    },
    {
      id: 3,
      employee_id: currentUser.id,
      business_id: 1,
      time_off_type: 'sick_leave',
      start_date: '2024-11-25',
      end_date: '2024-11-26',
      is_full_day: true,
      half_day_period: undefined,
      is_recurring: false,
      recurrence_pattern: null,
      status: 'approved',
      requested_by: currentUser.id,
      approved_by: 1,
      notes: 'Flu symptoms',
      created_at: '2024-11-24T08:00:00Z',
      updated_at: '2024-11-24T08:00:00Z',
      employee_name: currentUser.name,
      employee_email: currentUser.email,
      requester_name: currentUser.name,
      approver_name: 'Business Owner'
    }
  ]);

  const getTimeOffTypeColor = (type: string) => {
    switch (type) {
      case 'holiday': return 'bg-green-600 text-white';
      case 'sick_leave': return 'bg-red-600 text-white';
      case 'personal_day': return 'bg-blue-600 text-white';
      case 'vacation': return 'bg-purple-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckIcon className="h-4 w-4 text-green-600" />;
      case 'pending': return <ClockIcon className="h-4 w-4 text-yellow-600" />;
      case 'rejected': return <XMarkIcon className="h-4 w-4 text-red-600" />;
      case 'cancelled': return <ExclamationTriangleIcon className="h-4 w-4 text-gray-600" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (startDate === endDate) {
      return formatDate(startDate);
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const handleCreateTimeOff = (data: TimeOffCreate) => {
    const newTimeOff: EmployeeTimeOff = {
      id: Date.now(), // Mock ID
      employee_id: currentUser.id,
      business_id: 1,
      time_off_type: data.time_off_type,
      start_date: data.start_date,
      end_date: data.end_date,
      is_full_day: data.is_full_day,
      half_day_period: data.half_day_period,
      is_recurring: data.is_recurring,
      recurrence_pattern: data.recurrence_pattern,
      status: 'pending',
      requested_by: currentUser.id,
      approved_by: null,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee_name: currentUser.name,
      employee_email: currentUser.email,
      requester_name: currentUser.name,
      approver_name: null
    };

    setTimeOffEntries(prev => [newTimeOff, ...prev]);
    setShowFormModal(false);
  };

  const handleCancelTimeOff = (id: number) => {
    if (window.confirm('Are you sure you want to cancel this time-off request?')) {
      setTimeOffEntries(prev => 
        prev.map(entry => 
          entry.id === id 
            ? { ...entry, status: 'cancelled' as const }
            : entry
        )
      );
    }
  };

  const filteredEntries = timeOffEntries.filter(entry => {
    if (filterStatus === 'all') return true;
    return entry.status === filterStatus;
  });

  const upcomingEntries = timeOffEntries.filter(entry => 
    new Date(entry.start_date) >= new Date() && entry.status === 'approved'
  );

  const pendingEntries = timeOffEntries.filter(entry => entry.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">My Time-off</h1>
              <p className="mt-2 text-gray-400">Request and manage your time-off</p>
            </div>
            <button
              onClick={() => setShowFormModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Request Time-off
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-600 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Upcoming</p>
                <p className="text-2xl font-bold text-white">{upcomingEntries.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-600 rounded-lg">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-white">{pendingEntries.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-600 rounded-lg">
                <CheckIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">This Year</p>
                <p className="text-2xl font-bold text-white">
                  {timeOffEntries.filter(entry => 
                    entry.status === 'approved' && 
                    new Date(entry.start_date).getFullYear() === new Date().getFullYear()
                  ).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-300">Filter by status:</span>
            <div className="flex space-x-2">
              {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Time-off List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No time-off entries</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterStatus === 'all' 
                  ? "You haven't requested any time-off yet."
                  : `No ${filterStatus} time-off entries found.`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="p-6 hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        getTimeOffTypeColor(entry.time_off_type)
                      }`}>
                        {entry.time_off_type.replace('_', ' ')}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-white font-medium">
                            {formatDateRange(entry.start_date, entry.end_date)}
                          </span>
                          {!entry.is_full_day && (
                            <span className="text-sm text-gray-400">
                              ({entry.half_day_period})
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusIcon(entry.status)}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            getStatusColor(entry.status)
                          }`}>
                            {entry.status}
                          </span>
                        </div>
                        
                        {entry.notes && (
                          <p className="text-gray-400 text-sm mt-1">{entry.notes}</p>
                        )}
                        
                        {entry.approver_name && (
                          <p className="text-gray-500 text-xs mt-1">
                            {entry.status === 'approved' ? 'Approved by' : 'Rejected by'} {entry.approver_name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {entry.status === 'pending' && (
                        <button
                          onClick={() => handleCancelTimeOff(entry.id)}
                          className="flex items-center px-3 py-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowFormModal(true)}
              className="flex items-center p-4 bg-blue-600/20 border border-blue-600 rounded-lg hover:bg-blue-600/30 transition-colors"
            >
              <PlusIcon className="h-6 w-6 text-blue-400 mr-3" />
              <div className="text-left">
                <p className="text-white font-medium">Request Time-off</p>
                <p className="text-gray-400 text-sm">Submit a new time-off request</p>
              </div>
            </button>
            
            <button
              onClick={() => setFilterStatus('pending')}
              className="flex items-center p-4 bg-yellow-600/20 border border-yellow-600 rounded-lg hover:bg-yellow-600/30 transition-colors"
            >
              <ClockIcon className="h-6 w-6 text-yellow-400 mr-3" />
              <div className="text-left">
                <p className="text-white font-medium">View Pending</p>
                <p className="text-gray-400 text-sm">Check your pending requests</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Request Time-off</h3>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* TODO: Implement TimeOffFormModal component for employee use */}
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-300">Time-off Request Form</h3>
                <p className="mt-1 text-sm text-gray-500">
                  The time-off request form will be implemented here.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTimeOff;
