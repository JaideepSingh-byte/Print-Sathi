/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Campus Shop Directory
 * ============================================================================
 * 
 * Displays available print shops on campus with status, pricing, and routing.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToApprovedShops, getApprovedShops } from '../services/firebase';
import QRStandeeModal from './QRStandeeModal';

export default function ShopDirectory({ onSelectShop }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [standeeShop, setStandeeShop] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToApprovedShops(
      (data) => {
        setShops(data);
        setLoading(false);
      },
      (err) => {
        console.warn('Could not subscribe to approved shops:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredShops = shops.filter((shop) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = shop.name?.toLowerCase().includes(query);
    const buildingMatch = shop.location?.building?.toLowerCase().includes(query);
    const floorMatch = shop.location?.floor?.toLowerCase().includes(query);
    return nameMatch || buildingMatch || floorMatch;
  });

  const handleChooseShop = (shop) => {
    if (onSelectShop) {
      onSelectShop(shop);
    }
    navigate(`/shop/${shop.shopId}`);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0.5rem 0' }}>
      {/* Search & Header Row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
            Campus Xerox Counters & Print Stations
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
            Select your nearest pickup counter to queue files and avoid waiting in line.
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            placeholder="🔍 Search by building, shop name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Loading active campus print centers...
        </div>
      ) : filteredShops.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1.5rem',
          background: '#1e293b',
          borderRadius: '12px',
          border: '1px solid #334155'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🖨️</div>
          <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#f8fafc' }}>
            {shops.length === 0 ? 'No Approved Campus Print Counters Yet' : 'No matching print counters found'}
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.35rem', maxWidth: '480px', margin: '0.35rem auto 0', lineHeight: '1.45' }}>
            {shops.length === 0
              ? 'Counters must be registered via the Shopkeeper Portal and approved by the campus administrator before appearing here.'
              : 'Try searching by building name, Bhavan, or room number.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredShops.map((shop) => (
            <div
              key={shop.shopId}
              className="panel-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem',
                margin: 0,
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
            >
              <div>
                {/* Status Indicator & QR Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: shop.isAcceptingOrders !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: shop.isAcceptingOrders !== false ? '#34d399' : '#f87171',
                    border: shop.isAcceptingOrders !== false ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    {shop.isAcceptingOrders !== false ? '🟢 Accepting Orders' : '🔴 Paused'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setStandeeShop(shop)}
                    title="View & Print Counter QR Standee"
                    style={{
                      background: 'rgba(51, 65, 85, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span>📱</span> QR Standee
                  </button>
                </div>

                {/* Counter Name (Exact chosen name from Firestore) */}
                <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 0.35rem' }}>
                  {shop.name}
                </h4>

                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 0.85rem' }}>
                  {shop.tagline || 'Campus printing, photocopy, and spiral binding'}
                </p>

                {/* Location Box */}
                <div style={{
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  marginBottom: '0.75rem',
                  lineHeight: '1.5'
                }}>
                  <div>📍 <strong>Location:</strong> {shop.location?.building}, {shop.location?.floor}</div>
                  <div>🚪 <strong>Room/Counter:</strong> {shop.location?.room || 'Main Desk'}</div>
                  {shop.contactPhone && (
                    <div>📞 <strong>Phone:</strong> {shop.contactPhone}</div>
                  )}
                </div>

                {/* Supported Services & Tier Rates */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                    {shop.supportedServices?.bw !== false && <span style={pillStyle}>B&W Printing</span>}
                    {shop.supportedServices?.color && <span style={pillStyle}>Color</span>}
                    {shop.supportedServices?.single !== false && <span style={pillStyle}>Single-Sided</span>}
                    {shop.supportedServices?.duplex && <span style={pillStyle}>Duplex</span>}
                  </div>

                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Rates from: <strong style={{ color: '#38bdf8' }}>₹{shop.pricingTiers?.bw?.single?.[0]?.rate ?? 2}/pg (B&W)</strong>
                    {shop.supportedServices?.color && (
                      <span> &bull; <strong style={{ color: '#38bdf8' }}>₹{shop.pricingTiers?.color?.single?.[0]?.rate ?? 8}/pg (Color)</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  type="button"
                  className="primary-action-btn"
                  onClick={() => handleChooseShop(shop)}
                  disabled={shop.isAcceptingOrders === false}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    padding: '0.65rem 1rem',
                    fontSize: '0.88rem'
                  }}
                >
                  {shop.isAcceptingOrders !== false ? 'Select Counter & Upload PDF →' : 'Counter Temporarily Paused'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Standee Modal */}
      {standeeShop && (
        <QRStandeeModal
          shop={standeeShop}
          isOpen={Boolean(standeeShop)}
          onClose={() => setStandeeShop(null)}
        />
      )}
    </div>
  );
}

const pillStyle = {
  fontSize: '0.72rem',
  fontWeight: '600',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
  background: 'rgba(56, 189, 248, 0.15)',
  color: '#38bdf8',
  border: '1px solid rgba(56, 189, 248, 0.3)',
};
