import React, { useState, useRef } from 'react';
import { Upload, X, Star, Trash2, Edit, Camera, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { imageAPI, getImageUrl } from '../../utils/api';

// Inline types to avoid import issues
interface SalonImage {
  id: number;
  place_id: number;
  image_url: string;
  image_alt?: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

interface SalonImageManagerProps {
  salonId: number;
  salonName: string;
  images: SalonImage[];
  onImagesChange: (images: SalonImage[]) => void;
}

const SalonImageManager: React.FC<SalonImageManagerProps> = ({
  salonId,
  salonName,
  images,
  onImagesChange
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [editingImage, setEditingImage] = useState<SalonImage | null>(null);
  const [editForm, setEditForm] = useState({
    image_alt: '',
    is_primary: false,
    display_order: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    setUploadError('');

    try {
      // Upload the file first
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const uploadData = await uploadResponse.json();
      
      const imageData = {
        image_url: uploadData.file_url,
        image_alt: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        is_primary: images.length === 0, // First image is primary
        display_order: images.length
      };

      // Call the API to save the image metadata
      const newImage = await imageAPI.addSalonImage(salonId, imageData);
      
      // Add to local state
      onImagesChange([...images, newImage]);

    } catch (error) {
      setUploadError('Failed to upload image. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      // Update all images to set only the selected one as primary
      const updatedImages = images.map(img => ({
        ...img,
        is_primary: img.id === imageId
      }));
      
      // Call API to update the image
      await imageAPI.updateSalonImage(salonId, imageId, { is_primary: true });
      
      // Update local state
      onImagesChange(updatedImages);
    } catch (error) {
      console.error('Error setting primary image:', error);
      setUploadError('Failed to set primary image. Please try again.');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Call API to delete the image
      await imageAPI.deleteSalonImage(salonId, imageId);
      
      const updatedImages = images.filter(img => img.id !== imageId);
      
      // If we deleted the primary image, make the first remaining image primary
      const deletedImage = images.find(img => img.id === imageId);
      if (deletedImage?.is_primary && updatedImages.length > 0) {
        updatedImages[0].is_primary = true;
        // Also update the new primary image in the database
        await imageAPI.updateSalonImage(salonId, updatedImages[0].id, { is_primary: true });
      }

      onImagesChange(updatedImages);
    } catch (error) {
      console.error('Error deleting image:', error);
      setUploadError('Failed to delete image. Please try again.');
    }
  };

  const handleEditImage = (image: SalonImage) => {
    setEditingImage(image);
    setEditForm({
      image_alt: image.image_alt || '',
      is_primary: image.is_primary,
      display_order: image.display_order
    });
  };

  const handleSaveEdit = async () => {
    if (!editingImage) return;

    try {
      // Call API to update the image
      const updatedImage = await imageAPI.updateSalonImage(salonId, editingImage.id, {
        image_alt: editForm.image_alt,
        is_primary: editForm.is_primary,
        display_order: editForm.display_order
      });

      const updatedImages = images.map(img => {
        if (img.id === editingImage.id) {
          return updatedImage;
        }
        // If setting this image as primary, unset others
        if (editForm.is_primary && img.id !== editingImage.id) {
          return { ...img, is_primary: false };
        }
        return img;
      });

      onImagesChange(updatedImages);
      setEditingImage(null);
    } catch (error) {
      console.error('Error updating image:', error);
      setUploadError('Failed to update image. Please try again.');
    }
  };

  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold" style={{color: '#2a2a2e'}}>Salon Images</h3>
          <p className="text-sm text-gray-600">Manage images for {salonName}</p>
        </div>
        <div className="text-sm font-medium" style={{color: '#2a2a2e'}}>
          {images.length} image{images.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Camera className="h-6 w-6 text-gray-400" />
          </div>
          
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn-primary inline-flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Images'}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              PNG, JPG, GIF up to 5MB
            </p>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
            <AlertCircle className="h-4 w-4 mr-2" />
            {uploadError}
          </div>
        )}
      </div>

      {/* Images Grid */}
      {sortedImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedImages.map((image, index) => (
            <div key={image.id} className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Image */}
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={getImageUrl(image.image_url)}
                  alt={image.image_alt || `Salon image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', image.image_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Primary Badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    Primary
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditImage(image)}
                      className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-colors"
                      title="Edit image"
                    >
                      <Edit className="h-3 w-3 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="p-1 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-colors"
                      title="Delete image"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Image Info */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate" style={{color: '#2a2a2e'}}>
                    {image.image_alt || `Image ${index + 1}`}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    #{image.display_order + 1}
                  </span>
                </div>

                {/* Set Primary Button */}
                {!image.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(image.id)}
                    className="w-full text-xs py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center font-medium text-white hover:opacity-90"
                    style={{backgroundColor: '#2a2a2e'}}
                  >
                    <Star className="h-3 w-3 mr-1" />
                    Set as Primary
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedImages.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No images yet</h4>
          <p className="text-gray-600 mb-4">
            Upload images to showcase your salon and attract more customers.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            Upload Your First Image
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold" style={{color: '#2a2a2e'}}>Edit Image</h3>
              <button
                onClick={() => setEditingImage(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Image Preview */}
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={getImageUrl(editingImage.image_url)}
                  alt={editingImage.image_alt || 'Edit image'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Form Fields */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                  Alt Text (for accessibility)
                </label>
                <input
                  type="text"
                  value={editForm.image_alt}
                  onChange={(e) => setEditForm({ ...editForm, image_alt: e.target.value })}
                  placeholder="Describe this image..."
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#2a2a2e'}}>
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.display_order}
                  onChange={(e) => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 text-gray-900"
                />
              </div>

              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={editForm.is_primary}
                  onChange={(e) => setEditForm({ ...editForm, is_primary: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 focus:ring-2 focus:ring-offset-2 transition-all duration-200"
                  style={{color: '#2a2a2e'}}
                />
                <label htmlFor="is_primary" className="ml-3 text-sm font-medium" style={{color: '#2a2a2e'}}>
                  Set as primary image (shown first)
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditingImage(null)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all duration-200 font-medium"
                style={{backgroundColor: '#2a2a2e'}}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonImageManager;
