import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  ClockIcon,
  UserIcon,
  FunnelIcon,
  EyeIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useOwnerApi } from '../../utils/ownerApi';
import type { EmployeeTimeOff, TimeOffCreate } from '../../types/timeOff';
import PlaceSelector from '../../components/owner/PlaceSelector';
import TimeOffFormModal from '../../components/owner/TimeOffFormModal';
import ClosedPeriodsModal from '../../components/owner/ClosedPeriodsModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeOffOverviewProps {
  selectedPlaceId: number | null;
}

const TimeOffOverview: React.FC<TimeOffOverviewProps> = ({ selectedPlaceId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedTimeOffType, setSelectedTimeOffType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTimeOff, setEditingTimeOff] = useState<EmployeeTimeOff | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showClosedModal, setShowClosedModal] = useState(false);

  const { 
    usePlaceTimeOff, 
    usePlaceTimeOffCalendar, 
    useCreateTimeOff, 
    useUpdateTimeOff, 
    useDeleteTimeOff,
    useApproveTimeOff,
    usePlaceEmployees,
    useClosedPeriods,
    useCreateClosedPeriod,
    useUpdateClosedPeriod,
    useDeleteClosedPeriod
  } = useOwnerApi();

  // Get employees for the selected place
  const { data: employees = [] } = usePlaceEmployees(selectedPlaceId || 0);
  
  // Get time-off data for calendar view
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const { data: timeOffData = [], isLoading } = usePlaceTimeOffCalendar(
    selectedPlaceId || 0, 
    startDate, 
    endDate
  );

  // Get all time-off for list view
  const { data: allTimeOff = [] } = usePlaceTimeOff(selectedPlaceId || 0);

  const createTimeOffMutation = useCreateTimeOff();
  const updateTimeOffMutation = useUpdateTimeOff();
  const deleteTimeOffMutation = useDeleteTimeOff();
  const approveTimeOffMutation = useApproveTimeOff();

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
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

  const handleCreateTimeOff = async (data: TimeOffCreate) => {
    try {
      await createTimeOffMutation.mutateAsync({
        placeId: selectedPlaceId as number,
        employeeId: data.employee_id,
        data
      });
      setShowFormModal(false);
    } catch (error) {
      console.error('Failed to create time-off:', error);
    }
  };

  const handleUpdateTimeOff = async (id: number, data: Partial<EmployeeTimeOff>) => {
    try {
      if (!editingTimeOff) return;
      await updateTimeOffMutation.mutateAsync({ 
        placeId: selectedPlaceId as number,
        employeeId: editingTimeOff.employee_id,
        id, 
        data 
      });
      setEditingTimeOff(null);
    } catch (error) {
      console.error('Failed to update time-off:', error);
    }
  };

  const handleDeleteTimeOff = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this time-off entry?')) {
      try {
        const employeeId = editingTimeOff ? editingTimeOff.employee_id : (selectedEmployee as number);
        if (!employeeId) return;
        await deleteTimeOffMutation.mutateAsync({ placeId: selectedPlaceId as number, employeeId, id });
      } catch (error) {
        console.error('Failed to delete time-off:', error);
      }
    }
  };

  const handleApproveTimeOff = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await approveTimeOffMutation.mutateAsync({
        id,
        data: { status, notes: status === 'approved' ? 'Approved by owner' : 'Rejected by owner' }
      });
    } catch (error) {
      console.error('Failed to update time-off status:', error);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getTimeOffForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return timeOffData.find(item => item.date === dateString)?.time_offs || [];
  };

  const filteredTimeOff = allTimeOff.filter(timeOff => {
    if (selectedEmployee && timeOff.employee_id !== selectedEmployee) return false;
    if (selectedTimeOffType !== 'all' && timeOff.time_off_type !== selectedTimeOffType) return false;
    if (selectedStatus !== 'all' && timeOff.status !== selectedStatus) return false;
    return true;
  });

  const getUpcomingTimeOff = () => {
    const today = new Date();
    return filteredTimeOff
      .filter(timeOff => new Date(timeOff.start_date) >= today)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 10);
  };

  const getPendingRequests = () => {
    return filteredTimeOff.filter(timeOff => timeOff.status === 'pending');
  };

  if (!selectedPlaceId) {
    return (
      <div className="p-8 text-center">
        <CalendarDaysIcon className="mx-auto h-12 w-12 text-charcoal/40" />
        <h3 className="mt-2 text-sm font-medium text-charcoal">No Place Selected</h3>
        <p className="mt-1 text-sm text-charcoal/60">Please select a place to view employee time-off.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-charcoal text-xl lg:text-2xl font-bold font-display">Time-off Overview</h2>
          <p className="mt-1 text-sm text-charcoal/60 font-body">Manage all employee holidays and time-off</p>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => setShowFormModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Time-off
          </button>
          <button
            onClick={() => setShowClosedModal(true)}
            className="ml-3 px-4 py-2 bg-white border border-medium-gray text-charcoal rounded-lg hover:bg-light-gray"
          >
            <CalendarDaysIcon className="h-4 w-4 mr-2 inline" />
            Manage Closed Periods
          </button>
        </div>
      </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-bright-blue text-white rounded-lg">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-charcoal/60">Total Entries</p>
                <p className="text-2xl font-bold text-charcoal">{filteredTimeOff.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500 text-white rounded-lg">
                <ClockIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-charcoal/60">Pending</p>
                <p className="text-2xl font-bold text-charcoal">{getPendingRequests().length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-lime-green text-white rounded-lg">
                <CheckIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-charcoal/60">Approved</p>
                <p className="text-2xl font-bold text-charcoal">
                  {filteredTimeOff.filter(t => t.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-purple-600 text-white rounded-lg">
                <UserIcon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-charcoal/60">Employees</p>
                <p className="text-2xl font-bold text-charcoal">{employees.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="mb-6 card p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-5 w-5 text-charcoal/60" />
                <span className="text-sm font-medium text-charcoal">Filters:</span>
              </div>
              
              <Select
                value={selectedEmployee ? String(selectedEmployee) : ''}
                onValueChange={(val) => setSelectedEmployee(val ? parseInt(val) : null)}
              >
                <SelectTrigger className="input-field text-sm whitespace-nowrap min-w-[12rem]">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedTimeOffType}
                onValueChange={setSelectedTimeOffType}
              >
                <SelectTrigger className="input-field text-sm whitespace-nowrap min-w-[12rem]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="sick_leave">Sick Leave</SelectItem>
                  <SelectItem value="personal_day">Personal Day</SelectItem>
                  <SelectItem value="vacation">Vacation</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="input-field text-sm whitespace-nowrap min-w-[12rem]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  viewMode === 'calendar' 
                    ? 'bg-bright-blue text-white border-bright-blue' 
                    : 'bg-white text-charcoal border-medium-gray hover:bg-light-gray'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  viewMode === 'list' 
                    ? 'bg-bright-blue text-white border-bright-blue' 
                    : 'bg-white text-charcoal border-medium-gray hover:bg-light-gray'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="card p-6 mb-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-charcoal">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 bg-white text-charcoal rounded-lg hover:bg-light-gray border border-medium-gray"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 bg-white text-charcoal rounded-lg hover:bg-light-gray border border-medium-gray text-sm"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 bg-white text-charcoal rounded-lg hover:bg-light-gray border border-medium-gray"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-charcoal/60">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {getDaysInMonth(currentDate).map((date, index) => {
                if (!date) {
                  return <div key={index} className="h-24"></div>;
                }

                const dayTimeOff = getTimeOffForDate(date);
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={date.toISOString()}
                    className={`h-24 p-2 border border-medium-gray rounded-lg bg-white hover:bg-light-gray transition-colors cursor-pointer ${
                      isToday ? 'outline outline-2 outline-bright-blue' : ''
                    }`}
                    onClick={() => {
                      setSelectedDate(date);
                      setShowFormModal(true);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium text-charcoal`}>
                        {date.getDate()}
                      </span>
                      {dayTimeOff.length > 0 && (
                        <span className="text-xs text-charcoal/60">
                          {dayTimeOff.length}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {dayTimeOff.slice(0, 2).map((timeOff, idx) => (
                        <div
                          key={idx}
                          className={`text-xs px-2 py-1 rounded text-white ${
                            getTimeOffTypeColor(timeOff.time_off_type)
                          } truncate`}
                          title={`${timeOff.employee_name} - ${timeOff.time_off_type.replace('_', ' ')}`}
                        >
                          {timeOff.employee_name}
                        </div>
                      ))}
                      {dayTimeOff.length > 2 && (
                        <div className="text-xs text-charcoal/60">
                          +{dayTimeOff.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {/* Upcoming Time-off */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Upcoming Time-off</h3>
              <div className="space-y-3">
                {getUpcomingTimeOff().map((timeOff) => (
                  <div key={timeOff.id} className="flex items-center justify-between p-4 bg-white border border-medium-gray rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        getTimeOffTypeColor(timeOff.time_off_type)
                      }`}>
                        {timeOff.time_off_type.replace('_', ' ')}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <UserIcon className="h-4 w-4 text-charcoal/60" />
                          <span className="text-charcoal font-medium">{timeOff.employee_name}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <ClockIcon className="h-4 w-4 text-charcoal/60" />
                          <span className="text-charcoal/80 text-sm">
                            {formatDateRange(timeOff.start_date, timeOff.end_date)}
                            {!timeOff.is_full_day && (
                              <span className="ml-2 text-xs">
                                ({timeOff.half_day_period})
                              </span>
                            )}
                          </span>
                        </div>
                        {timeOff.notes && (
                          <p className="text-charcoal/60 text-sm mt-1">{timeOff.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        getStatusColor(timeOff.status)
                      }`}>
                        {timeOff.status}
                      </span>
                      
                      {timeOff.status === 'pending' && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleApproveTimeOff(timeOff.id, 'approved')}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors"
                            title="Approve"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleApproveTimeOff(timeOff.id, 'rejected')}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Reject"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={() => setEditingTimeOff(timeOff)}
                        className="p-1 text-charcoal/60 hover:text-charcoal transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteTimeOff(timeOff.id)}
                        className="p-1 text-coral-red hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Requests */}
            {getPendingRequests().length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-charcoal mb-4">Pending Requests</h3>
                <div className="space-y-3">
                  {getPendingRequests().map((timeOff) => (
                    <div key={timeOff.id} className="flex items-center justify-between p-4 bg-white border border-medium-gray rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getTimeOffTypeColor(timeOff.time_off_type)
                        }`}>
                          {timeOff.time_off_type.replace('_', ' ')}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-4 w-4 text-charcoal/60" />
                            <span className="text-charcoal font-medium">{timeOff.employee_name}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <ClockIcon className="h-4 w-4 text-charcoal/60" />
                            <span className="text-charcoal/80 text-sm">
                              {formatDateRange(timeOff.start_date, timeOff.end_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleApproveTimeOff(timeOff.id, 'approved')}
                          className="flex items-center px-3 py-1 bg-lime-green text-white rounded-lg hover:bg-green-500 transition-colors text-sm"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproveTimeOff(timeOff.id, 'rejected')}
                          className="flex items-center px-3 py-1 bg-coral-red text-white rounded-lg hover:bg-red-500 transition-colors text-sm"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Modal */}
        {showFormModal && (
          <TimeOffFormModal
            isOpen={showFormModal}
            onClose={() => {
              setShowFormModal(false);
              setEditingTimeOff(null);
              setSelectedDate(null);
            }}
            onSubmit={handleCreateTimeOff}
            employees={employees}
            editingTimeOff={editingTimeOff}
            selectedDate={selectedDate || undefined}
          />
        )}
        {showClosedModal && selectedPlaceId && (
          <ClosedPeriodsModal
            isOpen={showClosedModal}
            onClose={() => setShowClosedModal(false)}
            businessId={selectedPlaceId}
          />
        )}
    </div>
  );
};

export default TimeOffOverview;
