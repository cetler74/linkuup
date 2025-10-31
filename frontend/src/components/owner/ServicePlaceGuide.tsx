import React from 'react';
import { InformationCircleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const ServicePlaceGuide: React.FC = () => {
  return (
    <div className="card">
      <div className="flex items-start space-x-3">
        <InformationCircleIcon className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-white mb-3">How Service-Place Assignment Works</h3>
          
          <div className="space-y-4 text-sm text-gray-300">
            <div className="space-y-2">
              <h4 className="font-medium text-white">🎯 Core Concept</h4>
              <p>
                Each service can be assigned to multiple places, and each place can have multiple services. 
                This allows you to create a flexible service catalog that can be customized per location.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-white">📋 How to Manage Assignments</h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Select a place from the dropdown above</li>
                <li>Click "Manage Assignments" to open the assignment interface</li>
                <li>Assign services from the "Available Services" list to the place</li>
                <li>Remove services from the "Assigned Services" list if needed</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-white">✨ Benefits</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Different places can offer different services</li>
                <li>Mobile services can be assigned to specific service areas</li>
                <li>Easy to manage service availability across locations</li>
                <li>Customers only see services available at their chosen location</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-white">🔧 Service Management Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-400" />
                    <span className="text-white font-medium">Create New Service</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-6">
                    Add a completely new service that doesn't exist anywhere yet
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-blue-400" />
                    <span className="text-white font-medium">Assign Existing Service</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-6">
                    Take an existing service and make it available at this place
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-700 p-3 rounded-lg">
              <h4 className="font-medium text-white mb-2">💡 Pro Tips</h4>
              <ul className="text-xs space-y-1">
                <li>• Create services once, then assign them to multiple places</li>
                <li>• Use the "Manage Assignments" feature for bulk operations</li>
                <li>• Services can have different prices at different places</li>
                <li>• Mobile services can be assigned to specific service areas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePlaceGuide;
