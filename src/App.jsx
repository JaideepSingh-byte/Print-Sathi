/**
 * ============================================================================
 * PRINT-SATHI: Main Application Component (App.jsx)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UploadZone from './components/UploadZone';
import PrintConfig from './components/PrintConfig';
import PriceBreakdown from './components/PriceBreakdown';
import PaymentModal from './components/PaymentModal';
import OrderConfirmation from './components/OrderConfirmation';
import RecentOrders from './components/RecentOrders';
import { submitPrintJob, getRecentPrintJobs } from './services/firebase';
import './App.css';

export default function App() {
  // Navigation tab: 'queue' (Form) | 'confirmation' (Token Ticket) | 'orders' (History) | 'shopkeeper' (Counter PC)
  const [activeTab, setActiveTab] = useState('queue');

  // File state
  const [activeFile, setActiveFile] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [calculatedPages, setCalculatedPages] = useState(1);

  // Print Configuration state
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState('bw');
  const [pageRangeMode, setPageRangeMode] = useState('all');
  const [customRangeString, setCustomRangeString] = useState('');
  const [sides, setSides] = useState('single');

  // Payment & Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orders, setOrders] = useState([]);

  // Load previous orders on startup
  useEffect(() => {
    refreshOrders();
  }, []);

  const refreshOrders = () => {
    const list = getRecentPrintJobs();
    setOrders(list);
  };

  // Triggered when student clicks "Proceed to Payment & Submit"
  const handleProceedToPayment = () => {
    setIsPaymentModalOpen(true);
  };

  // Triggered when student clicks "Simulate Payment Success" in the modal
  const handleConfirmPayment = async () => {
    const ratePerPage = colorMode === 'color' ? 5 : 1;
    const totalAmount = calculatedPages * copies * ratePerPage;

    const jobConfig = {
      totalPages,
      calculatedPages,
      copies,
      colorMode,
      pageRangeMode,
      pageRangeString: pageRangeMode === 'all' ? `All (${totalPages} pgs)` : customRangeString,
      sides,
      ratePerPage,
      totalAmount,
    };

    // Fast, resilient submit (timeout protected so it never hangs)
    const result = await submitPrintJob(jobConfig, activeFile);

    if (result.success) {
      setCurrentOrder(result.order);
      refreshOrders();
      setIsPaymentModalOpen(false);
      setActiveTab('confirmation');
    }
  };

  // Resets the configuration form to print a new document
  const handleResetForm = () => {
    setActiveFile(null);
    setTotalPages(1);
    setCalculatedPages(1);
    setCopies(1);
    setColorMode('bw');
    setPageRangeMode('all');
    setCustomRangeString('');
    setSides('single');
    setCurrentOrder(null);
    setActiveTab('queue');
  };

  // Inspect an existing order from history
  const handleSelectOrderFromHistory = (order) => {
    setCurrentOrder(order);
    setActiveTab('confirmation');
  };

  const activeRate = colorMode === 'color' ? 5 : 1;
  const currentTotalAmount = (activeFile ? calculatedPages : 0) * copies * activeRate;

  return (
    <div className="app-container">
      {/* Top Campus Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ordersCount={orders.length}
      />

      <main className="main-content">
        {/* VIEW 1: Main Print Queue Form (Student View) */}
        {activeTab === 'queue' && (
          <>
            {/* Campus Hero Banner */}
            <section className="hero-banner">
              <h2 className="hero-headline">Skip the Xerox Line. Print Smarter.</h2>
              <p className="hero-subhead">
                Upload your lecture slides, assignments, or notes. Configure pages and copies,
                pay via UPI, and grab your fresh prints using your unique 4-digit token!
              </p>
              <div className="workflow-steps">
                <div className="step-badge">
                  <span className="step-num">1</span>
                  <span>Upload PDF Document</span>
                </div>
                <div className="step-badge">
                  <span className="step-num">2</span>
                  <span>Configure Copies & Color</span>
                </div>
                <div className="step-badge">
                  <span className="step-num">3</span>
                  <span>UPI Pay & Get 4-Digit Token</span>
                </div>
              </div>
            </section>

            {/* Two-Column Grid: Left (Forms) | Right (Live Pricing) */}
            <div className="prototype-grid">
              <div className="flow-column">
                {/* 1. Document Upload Zone */}
                <UploadZone
                  activeFile={activeFile}
                  setActiveFile={setActiveFile}
                  totalPages={totalPages}
                  setTotalPages={setTotalPages}
                />

                {/* 2. Print Configuration Form */}
                <PrintConfig
                  totalPages={totalPages}
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
                  isFileActive={!!activeFile}
                />
              </div>

              {/* 3. Live Price Calculation Card (Sticky) */}
              <PriceBreakdown
                isFileActive={!!activeFile}
                calculatedPages={calculatedPages}
                copies={copies}
                colorMode={colorMode}
                sides={sides}
                pageRangeMode={pageRangeMode}
                customRangeString={customRangeString}
                onProceedToPayment={handleProceedToPayment}
              />
            </div>
          </>
        )}

        {/* VIEW 2: Order Confirmation & Counter Pickup Pass */}
        {activeTab === 'confirmation' && currentOrder && (
          <OrderConfirmation
            order={currentOrder}
            onReset={handleResetForm}
          />
        )}

        {/* VIEW 3: Past Orders & Campus Queue Tracker */}
        {activeTab === 'orders' && (
          <RecentOrders
            orders={orders}
            onSelectOrder={handleSelectOrderFromHistory}
            onBackToForm={() => setActiveTab('queue')}
            onRefreshOrders={refreshOrders}
          />
        )}

      </main>

      {/* Payment Simulation Modal (UPI QR Code) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={currentTotalAmount}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* Campus Footer */}
      <footer className="app-footer">
        <p>
          <strong>Print-Sathi</strong> • Campus Smart Print Queue Service Prototype
        </p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.76rem', color: '#94a3b8' }}>
          Strictly PDF (.pdf) • Standard Vanilla CSS3 • Firebase Storage & Firestore Architecture
        </p>
      </footer>
    </div>
  );
}
