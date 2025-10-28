import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Catalog from "./Catalog";

import CatalogItem from "./CatalogItem";

import QuotesList from "./QuotesList";

import QuoteCreate from "./QuoteCreate";

import QuoteView from "./QuoteView";

import ClientQuoteView from "./ClientQuoteView";

import QuoteTemplates from "./QuoteTemplates";

import ImportTemplates from "./ImportTemplates";

import CostCalculator from "./CostCalculator";

import ContractorPricing from "./ContractorPricing";

import ProjectCosts from "./ProjectCosts";

import Reports from "./Reports";

import PaintCalculator from "./PaintCalculator";

import PaintSettings from "./PaintSettings";

import SentQuotes from "./SentQuotes";

import QuoteCreateNew from "./QuoteCreateNew";

import Finance from "./Finance";

import ContractAgreement from "./ContractAgreement";

import AdminDashboard from "./AdminDashboard";

import AdminUsers from "./AdminUsers";

import AdminCategories from "./AdminCategories";

import QuotePrint from "./QuotePrint";

import AdminUserProfile from "./AdminUserProfile";

import AdminUserEdit from "./AdminUserEdit";

import Support from "./Support";

import AdminCustomerInquiries from "./AdminCustomerInquiries";

import ProjectManagement from "./ProjectManagement";

import DemolitionCalculator from "./DemolitionCalculator";

import PricebookSettings from "./PricebookSettings";

import Settings from "./Settings";

import Login from "./Login";

import Register from "./Register";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Catalog: Catalog,
    
    CatalogItem: CatalogItem,
    
    QuotesList: QuotesList,
    
    QuoteCreate: QuoteCreate,
    
    QuoteView: QuoteView,
    
    ClientQuoteView: ClientQuoteView,
    
    QuoteTemplates: QuoteTemplates,
    
    ImportTemplates: ImportTemplates,
    
    CostCalculator: CostCalculator,
    
    ContractorPricing: ContractorPricing,
    
    ProjectCosts: ProjectCosts,
    
    Reports: Reports,
    
    PaintCalculator: PaintCalculator,
    
    PaintSettings: PaintSettings,
    
    SentQuotes: SentQuotes,
    
    QuoteCreateNew: QuoteCreateNew,
    
    Finance: Finance,
    
    ContractAgreement: ContractAgreement,
    
    AdminDashboard: AdminDashboard,
    
    AdminUsers: AdminUsers,
    
    AdminCategories: AdminCategories,
    
    QuotePrint: QuotePrint,
    
    AdminUserProfile: AdminUserProfile,
    
    AdminUserEdit: AdminUserEdit,
    
    Support: Support,
    
    AdminCustomerInquiries: AdminCustomerInquiries,
    
    ProjectManagement: ProjectManagement,
    
    DemolitionCalculator: DemolitionCalculator,
    
    PricebookSettings: PricebookSettings,
    
    Settings: Settings,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    const { session, loading } = useAuth();

    // Public routes (without Layout)
    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.includes(location.pathname.toLowerCase());

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">טוען...</p>
                </div>
            </div>
        );
    }

    // If not authenticated and not on public route, redirect to login
    if (!session && !isPublicRoute) {
        return (
            <Routes>
                <Route path="*" element={<Login />} />
            </Routes>
        );
    }

    // If authenticated and on public route, redirect to dashboard
    if (session && isPublicRoute) {
        return (
            <Routes>
                <Route path="*" element={<Dashboard />} />
            </Routes>
        );
    }

    if (isPublicRoute) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Routes>
        );
    }

    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Catalog" element={<Catalog />} />
                
                <Route path="/CatalogItem" element={<CatalogItem />} />
                
                <Route path="/QuotesList" element={<QuotesList />} />
                
                <Route path="/QuoteCreate" element={<QuoteCreate />} />
                
                <Route path="/QuoteView" element={<QuoteView />} />
                
                <Route path="/ClientQuoteView" element={<ClientQuoteView />} />
                
                <Route path="/QuoteTemplates" element={<QuoteTemplates />} />
                
                <Route path="/ImportTemplates" element={<ImportTemplates />} />
                
                <Route path="/CostCalculator" element={<CostCalculator />} />
                
                <Route path="/ContractorPricing" element={<ContractorPricing />} />
                
                <Route path="/ProjectCosts" element={<ProjectCosts />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/PaintCalculator" element={<PaintCalculator />} />
                
                <Route path="/PaintSettings" element={<PaintSettings />} />
                
                <Route path="/SentQuotes" element={<SentQuotes />} />
                
                <Route path="/QuoteCreateNew" element={<QuoteCreateNew />} />
                
                <Route path="/Finance" element={<Finance />} />
                
                <Route path="/ContractAgreement" element={<ContractAgreement />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/AdminUsers" element={<AdminUsers />} />
                
                <Route path="/AdminCategories" element={<AdminCategories />} />
                
                <Route path="/QuotePrint" element={<QuotePrint />} />
                
                <Route path="/AdminUserProfile" element={<AdminUserProfile />} />
                
                <Route path="/AdminUserEdit" element={<AdminUserEdit />} />
                
                <Route path="/Support" element={<Support />} />
                
                <Route path="/AdminCustomerInquiries" element={<AdminCustomerInquiries />} />
                
                <Route path="/ProjectManagement" element={<ProjectManagement />} />
                
                <Route path="/DemolitionCalculator" element={<DemolitionCalculator />} />
                
                <Route path="/PricebookSettings" element={<PricebookSettings />} />
                
                <Route path="/Settings" element={<Settings />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}