import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, UserIcon, ChevronDownIcon, ChevronRightIcon, CalendarIcon, MagnifyingGlassIcon, BuildingOfficeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useOwnerApi, ownerApi } from '../../utils/ownerApi';
import { getImageUrl } from '../../utils/api';
import { useQueryClient } from '@tanstack/react-query';
import ServiceColorPicker from '../../components/owner/ServiceColorPicker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Employee {
  id: number;
  business_id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  specialty?: string;
  color_code?: string;
  photo_url?: string;
  is_active: boolean;
  working_hours?: { [key: string]: any };
  created_at: string;
  updated_at?: string;
  time_off?: Array<{
    time_off_type: string;
    start_date: string;
    end_date: string;
    status: string;
  }>;
}

interface Place {
  id: number;
  name: string;
  location_type: 'fixed' | 'mobile';
  city?: string;
  service_areas?: string[];
}

const EmployeesManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usePlaces, usePlaceEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, usePlaceServices, useAssignEmployeeServices, useEmployeeServices } = useOwnerApi();
  
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Employee',
    specialty: '',
    color_code: '#3B82F6',
    photo_url: '',
    services: [] as number[]
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<{ [key: string]: any }>({});
  const [expandedEmployees, setExpandedEmployees] = useState<Set<number>>(new Set());

  const { data: places = [] } = usePlaces();
  const { data: employees = [], isLoading } = usePlaceEmployees(selectedPlace?.id || 0);
  const { data: services = [] } = usePlaceServices(selectedPlace?.id || 0);
  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();
  const deleteEmployeeMutation = useDeleteEmployee();
  const assignEmployeeServicesMutation = useAssignEmployeeServices();

  useEffect(() => {
    if (places.length > 0 && !selectedPlace) {
      setSelectedPlace(places[0]);
    }
  }, [places, selectedPlace]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPlace) return;

    const employeeData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      role: formData.role,
      specialty: formData.specialty || undefined,
      color_code: formData.color_code
    };

    try {
      let employee;
      if (editingEmployee) {
        employee = await updateEmployeeMutation.mutateAsync({
          id: editingEmployee.id,
          data: employeeData
        });
      } else {
        employee = await createEmployeeMutation.mutateAsync({
          placeId: selectedPlace.id,
          data: employeeData
        });
      }
      
      // Assign services to employee
      if (employee && formData.services.length > 0) {
        await assignEmployeeServicesMutation.mutateAsync({
          employeeId: employee.id,
          serviceIds: formData.services
        });
      }
      
      // Upload photo if file is selected
      if (selectedFile && employee) {
        await uploadEmployeePhoto(employee.id, selectedFile);
      }
      
      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const handleEdit = async (employee: Employee) => {
    setEditingEmployee(employee);
    
    // Fetch employee services
    let employeeServices: number[] = [];
    try {
      const servicesResponse = await ownerApi.getEmployeeServices(employee.id);
      employeeServices = servicesResponse.services.map(service => service.id);
    } catch (error) {
      console.error('Error fetching employee services:', error);
    }
    
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      role: employee.role,
      specialty: employee.specialty || '',
      color_code: employee.color_code || '#3B82F6',
      photo_url: employee.photo_url || '',
      services: employeeServices
    });
    setSelectedFile(null);
    setPreviewUrl(employee.photo_url || null);
    setShowModal(true);
  };

  const handleDelete = async (employeeId: number) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployeeMutation.mutateAsync(employeeId);
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleManageHours = (employee: Employee) => {
    setEditingEmployee(employee);
    // Initialize with default working hours if none exist
    const defaultHours = {
      "monday": {"available": true, "start": "09:00", "end": "18:00"},
      "tuesday": {"available": true, "start": "09:00", "end": "18:00"},
      "wednesday": {"available": true, "start": "09:00", "end": "18:00"},
      "thursday": {"available": true, "start": "09:00", "end": "18:00"},
      "friday": {"available": true, "start": "09:00", "end": "18:00"},
      "saturday": {"available": false},
      "sunday": {"available": false}
    };
    setWorkingHours(employee.working_hours || defaultHours);
    setShowHoursModal(true);
  };

  const handleSaveHours = async () => {
    if (!editingEmployee) return;

    try {
      // Use the dedicated working hours API endpoint
      const response = await fetch(`/api/v1/owner/employees/${editingEmployee.id}/hours`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(workingHours)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save working hours');
      }
      
      setShowHoursModal(false);
      setEditingEmployee(null);
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error saving working hours:', error);
      alert('Failed to save working hours. Please try again.');
    }
  };

  const uploadEmployeePhoto = async (employeeId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`/api/v1/owner/employees/${employeeId}/photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to upload photo');
    }
    
    const result = await response.json();
    
    // Update the form data with the new photo URL
    setFormData(prev => ({
      ...prev,
      photo_url: result.photo_url
    }));
    
    // Update the preview URL
    setPreviewUrl(result.photo_url);
    
    // Invalidate employee queries to refresh the employee list
    if (selectedPlace) {
      queryClient.invalidateQueries({ queryKey: ['owner', 'places', selectedPlace.id, 'employees'] });
    }
    
    return result;
  };

  const deleteEmployeePhoto = async (employeeId: number) => {
    const response = await fetch(`/api/v1/owner/employees/${employeeId}/photo`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete photo');
    }
    
    // Invalidate employee queries to refresh the employee list
    if (selectedPlace) {
      queryClient.invalidateQueries({ queryKey: ['owner', 'places', selectedPlace.id, 'employees'] });
    }
    
    return response.json();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Employee',
      specialty: '',
      color_code: '#3B82F6',
      photo_url: '',
      services: []
    });
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingEmployee(null);
    resetForm();
  };

  const handleHoursModalClose = () => {
    setShowHoursModal(false);
    setEditingEmployee(null);
    setWorkingHours({});
  };

  const updateWorkingHours = (day: string, field: string, value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleServiceToggle = (serviceId: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(id => id !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  // Component to display employee services
  const EmployeeServicesDisplay = ({ employee }: { employee: Employee }) => {
    const { data: employeeServicesData, isLoading } = useEmployeeServices(employee.id);
    const employeeServices = employeeServicesData?.services || [];

    if (isLoading) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1E90FF] mx-auto"></div>
          <p className="text-sm text-[#9E9E9E] mt-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>Loading services...</p>
        </div>
      );
    }

    if (employeeServices.length === 0) {
      return (
        <div className="text-center py-8">
          <BuildingOfficeIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-3" />
          <p className="text-sm text-[#9E9E9E] mb-3" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            No services assigned
          </p>
          <button
            onClick={() => {
              setEditingEmployee(employee);
              setShowModal(true);
            }}
            className="text-[#1E90FF] hover:text-[#1877D2] text-sm font-medium"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          >
            Assign Services
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {employeeServices.map((service) => (
          <div key={service.id} className="flex items-center justify-between py-2 px-3 bg-[#F5F5F5] rounded-lg">
            <div className="flex-1">
              <span className="text-sm text-[#333333] font-medium" style={{ fontFamily: 'Open Sans, sans-serif' }}>{service.name}</span>
              <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{service.description}</p>
            </div>
            <div className="text-right">
              <span className="text-sm text-[#A3D55D] font-medium" style={{ fontFamily: 'Open Sans, sans-serif' }}>€{service.price}</span>
              <p className="text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{service.duration}min</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Filter places based on search term
  const filteredPlaces = places.filter(place =>
    place.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter employees based on search term, role, and status
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = !searchTerm || 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.specialty && employee.specialty.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !roleFilter || employee.role === roleFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && employee.is_active) ||
      (statusFilter === 'inactive' && !employee.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleEmployeeExpansion = (employeeId: number) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  const formatWorkingHours = (employee: Employee): string[] => {
    if (!employee.working_hours) return ['No working hours set'];
    
    const hours = employee.working_hours;
    const formattedDays = dayNames.map((day, index) => {
      const dayHours = hours[day];
      if (!dayHours || !dayHours.available) {
        return `${dayLabels[index]}: Closed`;
      }
      
      let timeStr = `${dayHours.start || '09:00'} - ${dayHours.end || '17:00'}`;
      if (dayHours.break_start && dayHours.break_end) {
        timeStr += ` (Break: ${dayHours.break_start} - ${dayHours.break_end})`;
      }
      
      return `${dayLabels[index]}: ${timeStr}`;
    });
    
    return formattedDays;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1E90FF]"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-[#F5F5F5]">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border border-[#E0E0E0]"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg className="w-6 h-6 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`w-1/3 max-w-sm flex flex-col border-r border-[#E0E0E0] bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.1)] lg:block ${
        sidebarOpen ? 'block' : 'hidden'
      }`}>
        <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>My Places</h2>
          <button
            className="lg:hidden p-1 text-[#9E9E9E] hover:text-[#1E90FF]"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-[#9E9E9E]" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
              placeholder="Search for a place"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            />
          </div>
        </div>

        {/* Places List */}
        <div className="flex-grow overflow-y-auto">
          <div className="flex flex-col">
            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                className={`flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between cursor-pointer transition-colors ${
                  selectedPlace?.id === place.id
                    ? 'bg-[#1E90FF] bg-opacity-10 border-l-4 border-[#1E90FF]'
                    : 'bg-white hover:bg-[#F5F5F5]'
                }`}
                onClick={() => {
                  setSelectedPlace(place);
                  setSidebarOpen(false); // Close sidebar on mobile when place is selected
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center rounded-lg shrink-0 size-12 ${
                    selectedPlace?.id === place.id ? 'bg-[#1E90FF]' : 'bg-[#F5F5F5]'
                  }`}>
                    {place.location_type === 'fixed' ? (
                      <BuildingOfficeIcon className={`h-6 w-6 ${
                        selectedPlace?.id === place.id ? 'text-white' : 'text-[#1E90FF]'
                      }`} />
                    ) : (
                      <MapPinIcon className={`h-6 w-6 ${
                        selectedPlace?.id === place.id ? 'text-white' : 'text-[#1E90FF]'
                      }`} />
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className={`text-base font-medium leading-normal line-clamp-1 ${
                      selectedPlace?.id === place.id ? 'text-[#1E90FF]' : 'text-[#333333]'
                    }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      {place.name}
                    </p>
                    <p className={`text-sm font-normal leading-normal line-clamp-2 ${
                      selectedPlace?.id === place.id ? 'text-[#1E90FF]' : 'text-[#9E9E9E]'
                    }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                      {place.location_type === 'fixed' ? 'Fixed Location' : 'Mobile/Service Area'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className={`flex size-7 items-center justify-center ${
                    selectedPlace?.id === place.id ? 'text-[#1E90FF]' : 'text-[#9E9E9E]'
                  }`}>
                    <UserIcon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-[#E0E0E0] px-6 py-4 shadow-[0px_2px_8px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>Employees Management</h1>
              <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {selectedPlace ? `Manage employees for ${selectedPlace.name}` : 'Select a place to manage employees'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setEditingEmployee(null);
                setShowModal(true);
              }}
              disabled={!selectedPlace}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#1E90FF] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1877D2] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Employee
            </button>
          </div>
          
          {/* Search and Filter Bar */}
          {selectedPlace && employees.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    Showing {filteredEmployees.length} of {employees.length} employees
                  </span>
                  {(searchTerm || roleFilter || statusFilter) && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setRoleFilter('');
                        setStatusFilter('');
                      }}
                      className="text-sm text-[#1E90FF] hover:text-[#1877D2] underline"
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-[#9E9E9E]" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF]"
                      placeholder="Search employees by name, email, or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ fontFamily: 'Open Sans, sans-serif' }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select 
                    value={roleFilter}
                    onValueChange={setRoleFilter}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Roles</SelectItem>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Specialist">Specialist</SelectItem>
                      <SelectItem value="Assistant">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Employees Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F5F5F5]">
          {selectedPlace ? (
            <>
              {/* Quick Stats */}
              {employees.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserIcon className="h-8 w-8 text-[#1E90FF]" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Total Employees</p>
                        <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>{employees.length}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-[#A3D55D] flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Active</p>
                        <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {employees.filter(emp => emp.is_active).length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-[#FF5A5F] flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Inactive</p>
                        <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {employees.filter(emp => !emp.is_active).length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-8 w-8 text-[#FFD43B]" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>With Hours Set</p>
                        <p className="text-2xl font-bold text-[#333333]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {employees.filter(emp => emp.working_hours).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-white shadow-[0px_2px_8px_rgba(0,0,0,0.1)] overflow-hidden sm:rounded-lg border border-[#E0E0E0]">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-[#9E9E9E]" />
              <h3 className="mt-2 text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {employees.length === 0 ? 'No employees' : 'No employees match your filters'}
              </h3>
              <p className="mt-1 text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                {employees.length === 0 
                  ? 'Get started by creating a new employee.'
                  : 'Try adjusting your search or filter criteria.'
                }
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#E0E0E0]">
              {filteredEmployees.map((employee) => (
                <li key={employee.id} className="bg-white hover:bg-[#F5F5F5] transition-colors">
                  <div className="px-6 py-6">
                    {/* Main Employee Information */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {employee.photo_url ? (
                            <div 
                              className="h-12 w-12 rounded-full overflow-hidden shadow-lg border-2"
                              style={{ borderColor: employee.color_code || '#3B82F6' }}
                            >
                              <img
                                src={`${getImageUrl(employee.photo_url || '')}?t=${encodeURIComponent(employee.updated_at || '')}`}
                                alt={employee.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl('default_employee.png'); }}
                              />
                            </div>
                          ) : (
                            <div 
                              className="h-12 w-12 rounded-full flex items-center justify-center shadow-lg"
                              style={{ backgroundColor: employee.color_code || '#3B82F6' }}
                            >
                              <span className="text-white font-semibold text-xl">
                                {employee.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-[#333333] truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>{employee.name}</h3>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                employee.is_active 
                                  ? 'bg-[#A3D55D] bg-opacity-20 text-[#A3D55D]' 
                                  : 'bg-[#FF5A5F] bg-opacity-20 text-[#FF5A5F]'
                              }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  employee.is_active ? 'bg-[#A3D55D]' : 'bg-[#FF5A5F]'
                                }`}></div>
                                {employee.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#1E90FF] bg-opacity-20 text-[#1E90FF]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                {employee.role}
                              </span>
                              {employee.specialty && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FFD43B] bg-opacity-20 text-[#FFD43B]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                  {employee.specialty}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Contact Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4 text-[#9E9E9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{employee.email}</span>
                              </div>
                              {employee.phone && (
                                <div className="flex items-center space-x-2">
                                  <svg className="h-4 w-4 text-[#9E9E9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{employee.phone}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4 text-[#9E9E9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Joined: {new Date(employee.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <svg className="h-4 w-4 text-[#9E9E9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Business ID: {employee.business_id}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleEmployeeExpansion(employee.id)}
                          className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-[#9E9E9E] hover:text-[#1E90FF] hover:bg-[#F5F5F5] rounded-lg transition-colors"
                          title="Toggle Details"
                          style={{ fontFamily: 'Open Sans, sans-serif' }}
                        >
                          {expandedEmployees.has(employee.id) ? (
                            <>
                              <ChevronDownIcon className="h-4 w-4" />
                              <span>Hide Details</span>
                            </>
                          ) : (
                            <>
                              <ChevronRightIcon className="h-4 w-4" />
                              <span>Show Details</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleManageHours(employee)}
                          className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded-lg transition-colors"
                          title="Manage Hours"
                        >
                          <ClockIcon className="h-4 w-4" />
                          <span>Hours</span>
                        </button>
                        <button
                          onClick={() => handleEdit(employee)}
                          className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-[#1E90FF] hover:text-[#1877D2] hover:bg-[#1E90FF] hover:bg-opacity-10 rounded-lg transition-colors"
                          title="Edit Employee"
                          style={{ fontFamily: 'Open Sans, sans-serif' }}
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-[#FF5A5F] hover:text-[#FF5A5F] hover:bg-[#FF5A5F] hover:bg-opacity-10 rounded-lg transition-colors"
                          title="Delete Employee"
                          style={{ fontFamily: 'Open Sans, sans-serif' }}
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Expanded Detailed Information */}
                    {expandedEmployees.has(employee.id) && (
                      <div className="mt-6 pt-6 border-t border-[#E0E0E0]">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Employee Details Card */}
                          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
                            <h4 className="text-lg font-semibold text-[#333333] mb-4 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              <UserIcon className="h-5 w-5 mr-2 text-[#1E90FF]" />
                              Employee Details
                            </h4>
                            <div className="space-y-4">
                              <div>
                                <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Full Name</label>
                                <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{employee.name}</p>
                              </div>
                              
                              <div>
                                <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Email Address</label>
                                <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{employee.email}</p>
                              </div>
                              
                              {employee.phone && (
                                <div>
                                  <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Phone Number</label>
                                  <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{employee.phone}</p>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Role</label>
                                  <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{employee.role}</p>
                                </div>
                                {employee.specialty && (
                                  <div>
                                    <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Specialty</label>
                                    <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{employee.specialty}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Status</label>
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      employee.is_active ? 'bg-[#A3D55D]' : 'bg-[#FF5A5F]'
                                    }`}></div>
                                    <span className={`text-sm font-medium ${
                                      employee.is_active ? 'text-[#A3D55D]' : 'text-[#FF5A5F]'
                                    }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                      {employee.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-[#9E9E9E] uppercase tracking-wide" style={{ fontFamily: 'Open Sans, sans-serif' }}>Joined Date</label>
                                  <p className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>{new Date(employee.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Services Card */}
                          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
                            <h4 className="text-lg font-semibold text-[#333333] mb-4 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-[#1E90FF]" />
                              Assigned Services
                            </h4>
                            <EmployeeServicesDisplay employee={employee} />
                          </div>
                          
                          {/* Working Hours Card */}
                          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
                            <h4 className="text-lg font-semibold text-[#333333] mb-4 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              <ClockIcon className="h-5 w-5 mr-2 text-[#1E90FF]" />
                              Working Hours
                            </h4>
                            <div className="space-y-3">
                              {employee.working_hours ? (
                                formatWorkingHours(employee).map((dayInfo, index) => (
                                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-[#F5F5F5] rounded-lg">
                                    <span className="text-sm text-[#333333] font-medium" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                      {dayLabels[index]}
                                    </span>
                                    <span className="text-sm text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                      {dayInfo.replace(`${dayLabels[index]}: `, '')}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8">
                                  <ClockIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-3" />
                                  <p className="text-sm text-[#9E9E9E] mb-3" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                    No working hours configured
                                  </p>
                                  <button
                                    onClick={() => handleManageHours(employee)}
                                    className="text-sm text-[#1E90FF] hover:text-[#1877D2] underline"
                                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                                  >
                                    Set up working hours
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Time-off Card */}
                          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6 lg:col-span-2">
                            <h4 className="text-lg font-semibold text-[#333333] mb-4 flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              <CalendarIcon className="h-5 w-5 mr-2 text-[#1E90FF]" />
                              Time-off & Leave
                            </h4>
                            <div className="space-y-3">
                              {(employee as any).time_off && (employee as any).time_off.length > 0 ? (
                                (employee as any).time_off.slice(0, 5).map((timeOff: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between py-3 px-4 bg-[#F5F5F5] rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        timeOff.time_off_type === 'holiday' ? 'bg-[#A3D55D] bg-opacity-20 text-[#A3D55D]' :
                                        timeOff.time_off_type === 'sick_leave' ? 'bg-[#FF5A5F] bg-opacity-20 text-[#FF5A5F]' :
                                        timeOff.time_off_type === 'personal_day' ? 'bg-[#1E90FF] bg-opacity-20 text-[#1E90FF]' :
                                        'bg-[#FFD43B] bg-opacity-20 text-[#FFD43B]'
                                      }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                        {timeOff.time_off_type.replace('_', ' ').toUpperCase()}
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        <svg className="h-4 w-4 text-[#9E9E9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                          {new Date(timeOff.start_date).toLocaleDateString()} - {new Date(timeOff.end_date).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      timeOff.status === 'approved' ? 'bg-[#A3D55D] bg-opacity-20 text-[#A3D55D]' :
                                      timeOff.status === 'pending' ? 'bg-[#FFD43B] bg-opacity-20 text-[#FFD43B]' :
                                      'bg-[#FF5A5F] bg-opacity-20 text-[#FF5A5F]'
                                    }`} style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                      {timeOff.status.toUpperCase()}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8">
                                  <CalendarIcon className="h-12 w-12 text-[#9E9E9E] mx-auto mb-3" />
                                  <p className="text-sm text-[#9E9E9E] mb-3" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                    No time-off requests found
                                  </p>
                                  <button
                                    onClick={() => {
                                      navigate('/owner/time-off', { 
                                        state: { 
                                          selectedEmployee: employee.id,
                                          selectedPlace: selectedPlace.id 
                                        } 
                                      });
                                    }}
                                    className="text-sm text-[#1E90FF] hover:text-[#1877D2] underline"
                                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                                  >
                                    Manage time-off requests
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-white">Select a place</h3>
              <p className="mt-1 text-sm text-gray-400">
                Choose a place from the sidebar to manage employees.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#333333] bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-[#E0E0E0] w-96 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-[#333333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter employee name"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  />
                </div>

                <div>
                  <Label htmlFor="role" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Specialist">Specialist</SelectItem>
                      <SelectItem value="Assistant">Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="specialty" className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Specialty</Label>
                  <Input
                    id="specialty"
                    type="text"
                    value={formData.specialty || ''}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="Enter specialty"
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  />
                </div>

                <ServiceColorPicker
                  color={formData.color_code}
                  onColorChange={(color) => setFormData({ ...formData, color_code: color })}
                  label="Employee Color"
                />

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>Services</label>
                  <div className="max-h-32 overflow-y-auto border border-[#E0E0E0] rounded-lg p-2 bg-[#F5F5F5]">
                    {services.length === 0 ? (
                      <p className="text-[#9E9E9E] text-sm" style={{ fontFamily: 'Open Sans, sans-serif' }}>No services available for this place</p>
                    ) : (
                      <div className="space-y-2">
                        {services.map((service) => (
                          <label key={service.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.services.includes(service.id)}
                              onChange={() => handleServiceToggle(service.id)}
                              className="rounded border-[#E0E0E0] text-[#1E90FF] focus:ring-[#1E90FF] focus:ring-2"
                            />
                            <span className="text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                              {service.name} - €{service.price} ({service.duration}min)
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    Select the services this employee can provide
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>Employee Photo</label>
                  <div className="flex items-center space-x-4">
                    {(previewUrl || formData.photo_url) && (
                      <div className="relative">
                        <img
                          src={getImageUrl((previewUrl || formData.photo_url) as string)}
                          alt="Employee preview"
                          className="w-16 h-16 rounded-full object-cover border-2"
                          style={{ borderColor: formData.color_code }}
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (editingEmployee && formData.photo_url && !previewUrl) {
                              // Delete existing photo from server
                              try {
                                await deleteEmployeePhoto(editingEmployee.id);
                              } catch (error) {
                                console.error('Error deleting photo:', error);
                                alert('Failed to delete photo');
                                return;
                              }
                            }
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            setFormData({ ...formData, photo_url: '' });
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full px-4 py-3 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1E90FF] file:text-white hover:file:bg-[#1877D2] focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] transition-all duration-200"
                        style={{ fontFamily: 'Open Sans, sans-serif' }}
                      />
                      <p className="text-xs text-[#9E9E9E] mt-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        Select an image file (max 5MB). Supported formats: JPG, PNG, GIF, WebP
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleModalClose}
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                    style={{ fontFamily: 'Open Sans, sans-serif' }}
                  >
                    {editingEmployee ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Working Hours Modal */}
      {showHoursModal && editingEmployee && (
        <div className="fixed inset-0 bg-[#333333] bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-[#E0E0E0] w-full max-w-2xl shadow-[0px_2px_8px_rgba(0,0,0,0.1)] rounded-lg bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-[#333333] mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Working Hours - {editingEmployee.name}
              </h3>
              
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const defaultHours = {
                      "monday": {"available": true, "start": "09:00", "end": "18:00"},
                      "tuesday": {"available": true, "start": "09:00", "end": "18:00"},
                      "wednesday": {"available": true, "start": "09:00", "end": "18:00"},
                      "thursday": {"available": true, "start": "09:00", "end": "18:00"},
                      "friday": {"available": true, "start": "09:00", "end": "18:00"},
                      "saturday": {"available": false},
                      "sunday": {"available": false}
                    };
                    setWorkingHours(defaultHours);
                  }}
                  className="px-3 py-1 text-sm font-medium text-[#1E90FF] hover:text-[#1877D2] border border-[#1E90FF] rounded-md hover:bg-[#1E90FF] hover:text-white transition-colors"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  Set Default Hours (Mon-Fri 9-18)
                </button>
              </div>
              
              <div className="space-y-4">
                {dayNames.map((day, index) => (
                  <div key={day} className="flex items-center space-x-4 p-4 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5]">
                    <div className="w-24">
                      <label className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        {dayLabels[index]}
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={workingHours[day]?.available || false}
                        onChange={(e) => updateWorkingHours(day, 'available', e.target.checked)}
                        className="h-4 w-4 text-[#1E90FF] focus:ring-[#1E90FF] border-[#E0E0E0] bg-white rounded"
                      />
                      <label className="ml-2 text-sm text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Available</label>
                    </div>
                    
                    {workingHours[day]?.available && (
                      <div className="flex items-center space-x-2">
                        <div>
                          <label className="block text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Start</label>
                          <input
                            type="time"
                            value={workingHours[day]?.start || '09:00'}
                            onChange={(e) => updateWorkingHours(day, 'start', e.target.value)}
                            className="block w-24 border border-[#E0E0E0] bg-[#F5F5F5] text-[#333333] rounded-md shadow-sm focus:ring-[#1E90FF] focus:border-[#1E90FF] sm:text-sm"
                            style={{ fontFamily: 'Open Sans, sans-serif' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#9E9E9E]" style={{ fontFamily: 'Open Sans, sans-serif' }}>End</label>
                          <input
                            type="time"
                            value={workingHours[day]?.end || '17:00'}
                            onChange={(e) => updateWorkingHours(day, 'end', e.target.value)}
                            className="block w-24 border border-[#E0E0E0] bg-[#F5F5F5] text-[#333333] rounded-md shadow-sm focus:ring-[#1E90FF] focus:border-[#1E90FF] sm:text-sm"
                            style={{ fontFamily: 'Open Sans, sans-serif' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleHoursModalClose}
                  className="px-4 py-2 text-sm font-medium text-[#333333] bg-white border border-[#E0E0E0] rounded-lg shadow-sm hover:bg-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E90FF]"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveHours}
                  disabled={updateEmployeeMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#1E90FF] border border-transparent rounded-lg shadow-sm hover:bg-[#1877D2] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E90FF] disabled:opacity-50"
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                >
                  Save Hours
                </button>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EmployeesManagement;
