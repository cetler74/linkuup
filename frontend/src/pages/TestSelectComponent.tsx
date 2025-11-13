import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TestSelectComponent = () => {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [name, setName] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Name: ${name}, Role: ${selectedRole}`);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] p-6">
        <h1 className="text-2xl font-bold text-[#333333] mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>Test Select Component</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
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

          <div className="flex gap-2">
            <Button type="submit">Submit</Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setName('');
                setSelectedRole('');
              }}
            >
              Reset
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-[#F5F5F5] rounded-lg">
          <h3 className="font-semibold mb-2 text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Current Values:</h3>
          <p className="text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Name: {name || 'Not set'}</p>
          <p className="text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>Role: {selectedRole || 'Not selected'}</p>
        </div>
      </div>
    </div>
  );
};

export default TestSelectComponent;
