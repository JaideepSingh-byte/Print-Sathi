/**
 * ============================================================================
 * PRINT-SATHI COMPONENT: Shop-Specific Print View (/shop/:shopId)
 * ============================================================================
 * 
 * Handles direct QR code routing and counter-specific file uploads,
 * pricing, and queue submission.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UploadZone from './UploadZone';
import PrintConfig from './PrintConfig';
import PriceBreakdown from './PriceBreakdown';
import PaymentModal from './PaymentModal';
import OrderConfirmation from './OrderConfirmation';
import { getShopById, submitMultiFileOrder } from '../services/firebase';

export default function ShopView({ onOrderCreated }) {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [loadingShop, setLoadingShop] = useState(true);

  // Multi-file state
  const [filesList, setFilesList] = useState([]);

  // Print Configuration State
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState('bw');
  const [pageRangeMode, setPageRangeMode] = useState('all');
  const [customRangeString, setCustomRangeString] = useState('');
  const [sides, setSides] = useState('single');
  const [calculatedPages, setCalculatedPages] = useState(1);

  // Modal & Order Confirmation State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  useEffect(() => {
    async function loadTargetShop() {
      setLoadingShop(true);
      try {
        const found = await getShopById(shopId);
        setShop(found);
      } catch (err) {
        console.warn('Error loading shop:', err);
      } finally {
        setLoadingShop(false);
      }
    }
    loadTargetShop();
  }, [shopId]);

  const handleProceedToPayment = () => {
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    const pickupCounter = shop 
      ? `${shop.name} (${shop.location?.building || 'Campus Plaza'}, ${shop.location?.floor || 'Ground'})` 
      : 'Counter 1 (Main Student Plaza)';

    const orderConfig = {
      shopId: shop?.shopId || shopId,
      pickupCounter,
      shopPricing: shop?.pricingTiers || null,
    };

    const result = await submitMultiFileOrder(orderConfig, filesList);

    if (result.success) {
      setCurrentOrder(result.order);
      if (onOrderCreated) {
        onOrderCreated(result.order);
      }
      setIsPaymentModalOpen(false);
    }
  };

  const handleResetForm = () => {
    setFilesList([]);
    setCopies(1);
    setColorMode('bw');
    setPageRangeMode('all');
    setCustomRangeString('');
    setSides('single');
    setCurrentOrder(null);
  };

  if (loadingShop) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
        Loading print counter details...
      </div>
    );
  }

  // If order was completed, render confirmation slip
  if (currentOrder) {
    return (
      <OrderConfirmation
        order={currentOrder}
        onReset={handleResetForm}
      />
    );
  }

  return (
    <div>
      {/* Top Counter Bar */}
      <div style={{
        background: 'linear-gradient(90deg, #1e1b4b 0%, #1e293b 100%)',
        border: '1px solid #312e81',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: '#4f46e5',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            🖨️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                {shop?.name || 'Campus Print Counter'}
              </h3>
              <span style={{
                fontSize: '0.7rem',
                background: shop?.isAcceptingOrders !== false ? '#065f46' : '#991b1b',
                color: '#fff',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontWeight: '600'
              }}>
                {shop?.isAcceptingOrders !== false ? 'OPEN' : 'PAUSED'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0.2rem 0 0' }}>
              📍 {shop?.location?.building || 'Main Campus'}, {shop?.location?.floor || 'Floor 1'} &bull; {shop?.location?.room || 'Counter'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-action-btn"
          onClick={() => navigate('/')}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
        >
          ← Switch Counter
        </button>
      </div>

      {/* Main Two-Column Grid */}
      <div className="prototype-grid">
        <div className="flow-column">
          {/* Step 1: Multi-file upload */}
          <UploadZone
            filesList={filesList}
            setFilesList={setFilesList}
          />

          {/* Step 2: Print Configuration */}
          <PrintConfig
            filesList={filesList}
            setFilesList={setFilesList}
            copies={copies}
            setCopies={setCopies}
            colorMode={colorMode}
            setColorMode={setColorMode}
            pageRangeMode={pageRangeMode}
            setPageRangeMode={setPageRangeMode}
            customRangeString={customRangeString}
            setCustomRangeString={setCustomRangeString}
            sides={sides}
            setSides={setSides}
            setCalculatedPages={setCalculatedPages}
            isFileActive={filesList.length > 0}
            supportedServices={shop?.supportedServices}
          />
        </div>

        {/* Step 3: Sticky Price Card */}
        <PriceBreakdown
          filesList={filesList}
          shop={shop}
          onProceedToPayment={handleProceedToPayment}
        />
      </div>

      {/* Payment Simulation Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={
          filesList.reduce((acc, f) => acc + (f.itemTotal || 0), 0)
        }
        onConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
}
