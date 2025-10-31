import React, { useState } from 'react';
import { ChromePicker } from 'react-color';

interface ServiceColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  label?: string;
  disabled?: boolean;
}

const ServiceColorPicker: React.FC<ServiceColorPickerProps> = ({
  color,
  onColorChange,
  label = "Service Color",
  disabled = false
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const predefinedColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6B7280', // Gray
  ];

  const handleColorChange = (newColor: any) => {
    onColorChange(newColor.hex);
  };

  const handlePredefinedColorClick = (predefinedColor: string) => {
    onColorChange(predefinedColor);
    setShowPicker(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">
        {label}
      </label>
      
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          disabled={disabled}
          className="w-10 h-10 rounded-md border-2 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-600 disabled:cursor-not-allowed bg-gray-700 text-white"
          placeholder="#000000"
        />
      </div>

      {/* Predefined Colors */}
      <div className="flex flex-wrap gap-2">
        {predefinedColors.map((predefinedColor) => (
          <button
            key={predefinedColor}
            type="button"
            onClick={() => handlePredefinedColorClick(predefinedColor)}
            disabled={disabled}
            className={`w-6 h-6 rounded border-2 ${
              color === predefinedColor 
                ? 'border-white' 
                : 'border-gray-600 hover:border-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ backgroundColor: predefinedColor }}
            title={predefinedColor}
          />
        ))}
      </div>

      {/* Color Picker Modal */}
      {showPicker && (
        <div className="absolute z-50 mt-2">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-2">
            <ChromePicker
              color={color}
              onChange={handleColorChange}
              disableAlpha
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="px-3 py-1 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceColorPicker;
