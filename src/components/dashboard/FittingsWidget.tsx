'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Package, Eye, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { isWithinInterval, startOfDay } from 'date-fns';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

interface Fitting {
  _id: string;
  pickupDate: string;
  status: string;
  client?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    weddingDate?: string;
  };
  items?: Array<{ name: string; primaryPhoto?: string }>;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface FittingsWidgetProps {
  fittings: Fitting[];
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange, label: string) => void;
  activeRange: string;
  predefinedRanges: Record<string, DateRange>;
}

const FittingsWidget: React.FC<FittingsWidgetProps> = ({ fittings, dateRange, onDateRangeChange, activeRange, predefinedRanges }) => {
  const { t } = useTranslation('dashboard');
  const router = useRouter();
  const [showAllModal, setShowAllModal] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [imagePreview, setImagePreview] = useState<{ open: boolean; items: any[]; index: number }>({ open: false, items: [], index: 0 });

  const formatDateForInput = (date: Date) => date.toISOString().split('T')[0];

  const upcomingFittings = (fittings || []).filter((fitting) => {
    const d = new Date(fitting.pickupDate);
    const inSelectedRange = isWithinInterval(d, { start: dateRange.startDate, end: dateRange.endDate });
    const notInPast = d >= startOfDay(new Date());
    return inSelectedRange && notInPast;
  });

  useEffect(() => {
    if (activeRange === 'Custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (startDate <= endDate) {
        onDateRangeChange({ startDate, endDate }, 'Custom');
      }
    }
  }, [activeRange, customStartDate, customEndDate]);

  const availableRanges = { ...predefinedRanges, Custom: { startDate: new Date(), endDate: new Date() } };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-500/10 rounded-lg">
            <Users className="h-5 w-5 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">{t('widgets.fittings.title')}</h3>
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={activeRange}
            onChange={(e) => {
              if (e.target.value === 'Custom') {
                // initialize defaults
                if (!customStartDate || !customEndDate) {
                  const today = new Date();
                  const start = new Date();
                  start.setDate(today.getDate() - 7);
                  setCustomStartDate(formatDateForInput(start));
                  setCustomEndDate(formatDateForInput(today));
                }
                setShowCustomDatePicker(true);
              } else {
                const range = predefinedRanges[e.target.value];
                if (range) {
                  onDateRangeChange(range, e.target.value);
                  setShowCustomDatePicker(false);
                }
              }
            }}
            className="text-sm border border-white/20 rounded-md px-3 py-1 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-lg"
          >
            {Object.keys(availableRanges).map((key) => (
              <option key={key} value={key} className="bg-gray-800 text-white">
                {key}
              </option>
            ))}
          </select>
          {showCustomDatePicker && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="text-xs border border-white/20 rounded-md px-2 py-1 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400 text-xs">{t('widgets.fittings.to')}</span>
              <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="text-xs border border-white/20 rounded-md px-2 py-1 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {upcomingFittings.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-3 bg-violet-500/10 rounded-full w-fit mx-auto mb-3">
              <Users className="h-12 w-12 text-violet-400" />
            </div>
            <p className="text-gray-400 text-sm">{t('widgets.fittings.noFittings')}</p>
          </div>
        ) : (
          upcomingFittings.slice(0, 5).map((fitting) => (
            <div
              key={fitting._id}
              className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
              onClick={() => router.push(`/fittings/${fitting._id}`)}
            >
              <div className="p-1.5 bg-violet-500/10 rounded-full">
                <Calendar className="h-4 w-4 text-violet-400" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                {/* Col 1: Customer */}
                <div>
                  <p className="text-sm font-medium text-white">
                    {fitting.client ? `${fitting.client.firstName || ''} ${fitting.client.lastName || ''}`.trim() || t('widgets.fittings.unknownCustomer') : t('widgets.fittings.unknownCustomer')}
                    <span className="text-xs text-gray-400 ml-2">{t('widgets.fittings.phone')}: {fitting.client?.phone || '—'}</span>
                  </p>
                </div>

                {/* Col 2: Date/Time */}
                <div className="text-xs text-gray-300">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span>
                      {(() => { const s=String(fitting.pickupDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); const HH=s.substring(11,13); const MI=s.substring(14,16); return `${dd}/${mm}/${yy}${HH&&MI?` • ${HH}:${MI}`:''}`; })()}
                    </span>
                  </div>
                  {fitting.client && (fitting.client as any).weddingDate && (
                    <div className="mt-1">
                      <span className="text-gray-400">{t('widgets.fittings.weddingDate')}:</span>{' '}
                      <span>
                        {(() => { const s=String((fitting.client as any).weddingDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); return `${dd}/${mm}/${yy}`; })()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Col 3: Items count */}
                <div className="text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-300">{t('widgets.fittings.articles')}:</span>
                    <span>{fitting.items?.length || 0}</span>
                  </div>
                </div>

                {/* Col 4: Images carousel button */}
                <div className="flex justify-start md:justify-end">
                  <button
                    className="px-3 py-1.5 text-xs text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-md transition-colors"
                    onClick={(e) => { e.stopPropagation(); setImagePreview({ open: true, items: fitting.items || [], index: 0 }); }}
                  >
                    {t('widgets.fittings.images')}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {upcomingFittings.length > 5 && (
          <button onClick={() => setShowAllModal(true)} className="flex items-center justify-center gap-2 w-full p-2 mt-3 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors">
            <Eye className="h-3 w-3" />
            {t('widgets.fittings.viewAll', { count: upcomingFittings.length })}
          </button>
        )}
      </div>

      {showAllModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-white/10 max-w-2xl w-full max-h:[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">{t('widgets.fittings.viewAll', { count: upcomingFittings.length })}</h2>
              </div>
              <button onClick={() => setShowAllModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {upcomingFittings.map((fitting) => (
                  <div key={fitting._id} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer transition-colors" onClick={() => router.push(`/fittings/${fitting._id}`)}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white">
                        {fitting.client ? `${fitting.client.firstName || ''} ${fitting.client.lastName || ''}`.trim() || t('widgets.fittings.unknownCustomer') : t('widgets.fittings.unknownCustomer')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {(() => { const s=String(fitting.pickupDate); const dd=s.substring(8,10); const mm=s.substring(5,7); const yy=s.substring(0,4); const HH=s.substring(11,13); const MI=s.substring(14,16); return `${dd}/${mm}/${yy}${HH&&MI?` • ${HH}:${MI}`:''}`; })()}
                      </div>
                    </div>
                    {fitting.items && fitting.items.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2" onClick={(e) => e.stopPropagation()}>
                        {fitting.items.map((it, idx) => (
                          <button key={idx} type="button" className="relative aspect-square bg-gray-800 rounded overflow-hidden" onClick={() => setImagePreview({ open: true, items: fitting.items || [], index: idx })}>
                            <img src={it.primaryPhoto ? `/api/uploads/${it.primaryPhoto}` : '/file.svg'} alt={it.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Images Carousel Modal */}
      {imagePreview.open && createPortal(
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setImagePreview({ open: false, items: [], index: 0 })}>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900/95 border border-white/20 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-3 right-3 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white" onClick={() => setImagePreview({ open: false, items: [], index: 0 })}>
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between h-full">
              <button className="p-3 text-white/80 hover:text-white disabled:opacity-30" onClick={() => setImagePreview(s => ({ ...s, index: (s.index - 1 + s.items.length) % s.items.length }))} disabled={imagePreview.items.length <= 1} aria-label="Previous">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex-1 flex items-center justify-center p-4">
                {(() => {
                  const current = imagePreview.items[imagePreview.index];
                  const src = current?.primaryPhoto ? `/api/uploads/${current.primaryPhoto}` : '/file.svg';
                  return (
                    <img src={src} alt={current?.name || ''} className="max-h-[75vh] max-w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/file.svg'; }} />
                  );
                })()}
              </div>
              <button className="p-3 text-white/80 hover:text-white disabled:opacity-30" onClick={() => setImagePreview(s => ({ ...s, index: (s.index + 1) % s.items.length }))} disabled={imagePreview.items.length <= 1} aria-label="Next">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FittingsWidget;

