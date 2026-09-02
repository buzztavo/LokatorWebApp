import React, { useState, useEffect } from 'react';
import { X, MapPin, Mountain, Tag, AlignLeft, RefreshCw, Check } from 'lucide-react';
import { POI_CATEGORIES, POIFormData, POI } from '../types';

interface AddPoiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (poi: Omit<POI, 'id' | 'created_at'>) => Promise<void>;
  currentCenter: { lat: number; lng: number };
}

export const AddPoiModal: React.FC<AddPoiModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentCenter,
}) => {
  const [formData, setFormData] = useState<POIFormData>({
    name: '',
    description: '',
    category: 'Landmark',
    latitude: currentCenter.lat.toFixed(5),
    longitude: currentCenter.lng.toFixed(5),
    elevation: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When opening modal, update coordinates to latest map center if inputs haven't been customized
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        latitude: currentCenter.lat.toFixed(5),
        longitude: currentCenter.lng.toFixed(5),
      }));
      setErrorMsg(null);
    }
  }, [isOpen, currentCenter.lat, currentCenter.lng]);

  if (!isOpen) return null;

  const handleSyncCoordinates = () => {
    setFormData((prev) => ({
      ...prev,
      latitude: currentCenter.lat.toFixed(5),
      longitude: currentCenter.lng.toFixed(5),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const lat = parseFloat(String(formData.latitude));
    const lng = parseFloat(String(formData.longitude));

    if (!formData.name.trim()) {
      setErrorMsg('Please enter a name for the Point of Interest.');
      return;
    }

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMsg('Latitude must be a valid number between -90 and 90.');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setErrorMsg('Longitude must be a valid number between -180 and 180.');
      return;
    }

    let parsedElevation: number | null = null;
    if (formData.elevation !== '' && formData.elevation !== null && formData.elevation !== undefined) {
      const num = parseFloat(String(formData.elevation));
      if (isNaN(num)) {
        setErrorMsg('Elevation must be a valid number (or leave empty).');
        return;
      }
      parsedElevation = num;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        latitude: lat,
        longitude: lng,
        elevation: parsedElevation,
      });
      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'Landmark',
        latitude: currentCenter.lat.toFixed(5),
        longitude: currentCenter.lng.toFixed(5),
        elevation: '',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Point of Interest');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="add-poi-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="add-poi-modal-card"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-100 text-red-700">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">Add Point of Interest</h2>
              <p className="text-xs text-slate-500">Record a new location to your database</p>
            </div>
          </div>
          <button
            id="close-add-poi-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              POI Name <span className="text-red-500">*</span>
            </label>
            <input
              id="poi-name-input"
              type="text"
              required
              placeholder="e.g. Washington Monument, Lincoln Memorial"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Category
            </label>
            <select
              id="poi-category-select"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
            >
              {POI_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinates Section */}
          <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                Coordinates
              </span>
              <button
                type="button"
                onClick={handleSyncCoordinates}
                className="text-xs text-red-700 hover:text-red-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Prefill from map center
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Latitude</label>
                <input
                  id="poi-latitude-input"
                  type="number"
                  step="any"
                  required
                  placeholder="38.8895"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1 font-medium">Longitude</label>
                <input
                  id="poi-longitude-input"
                  type="number"
                  step="any"
                  required
                  placeholder="-77.0353"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Coordinates are automatically set to the current center of your map view, and you can edit them manually.
            </p>
          </div>

          {/* Elevation (Optional field) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-slate-400" />
              Elevation (meters, optional)
            </label>
            <div className="relative">
              <input
                id="poi-elevation-input"
                type="number"
                step="any"
                placeholder="e.g. 169 (leave empty if unknown)"
                value={formData.elevation}
                onChange={(e) => setFormData({ ...formData, elevation: e.target.value })}
                className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                meters
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Nullable field in database. Saves as <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded font-mono">null</code> if left blank.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
              Description / Notes (optional)
            </label>
            <textarea
              id="poi-description-input"
              rows={3}
              placeholder="Add historical context, visitor information, or personal notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              id="cancel-add-poi-btn"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-poi-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving to Supabase...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save POI
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
