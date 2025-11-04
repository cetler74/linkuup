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
      <label className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
        {label}
      </label>
      
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          disabled={disabled}
          className="w-10 h-10 rounded-md border-2 border-[#E0E0E0] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#333333] placeholder-[#9E9E9E] focus:outline-none focus:ring-2 focus:ring-[#1E90FF] focus:border-[#1E90FF] sm:text-sm disabled:bg-[#E0E0E0] disabled:cursor-not-allowed"
          placeholder="#000000"
          style={{ fontFamily: 'Open Sans, sans-serif' }}
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
                ? 'border-[#333333]' 
                : 'border-[#E0E0E0] hover:border-[#1E90FF]'
            } focus:outline-none focus:ring-2 focus:ring-[#1E90FF] disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{ backgroundColor: predefinedColor }}
            title={predefinedColor}
          />
        ))}
      </div>

      {/* Color Picker Modal */}
      {showPicker && (
        <div className="absolute z-50 mt-2">
          <div className="bg-white rounded-lg shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border border-[#E0E0E0] p-2">
            <ChromePicker
              color={color}
              onChange={handleColorChange}
              disableAlpha
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="px-3 py-1 text-sm text-[#333333] hover:text-[#1E90FF]"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="px-3 py-1 text-sm bg-[#1E90FF] text-white rounded hover:bg-[#1877D2]"
                style={{ fontFamily: 'Open Sans, sans-serif' }}
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
