import { createHashRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginScreen } from './auth/LoginScreen';
import { SyncProvider } from './sync/SyncProvider';
import { ImageViewerProvider } from './components/ui/ImageViewer';
import { Layout } from './routes/Layout';
import { Home } from './routes/Home';
import { CookMenu } from './routes/CookMenu';
import { MeasureMenu } from './routes/MeasureMenu';
import { ResourceDetail } from './routes/ResourceDetail';
import { Guide } from './routes/Guide';
import { GuideEditor } from './routes/GuideEditor';
import { PurchaseFlow } from './routes/PurchaseFlow';
import { ShoppingList } from './routes/ShoppingList';
import { ShoppingHistory } from './routes/ShoppingHistory';
import { ObjectsList } from './routes/ObjectsList';
import { LocationsList } from './routes/LocationsList';
import { RoomView } from './routes/RoomView';
import { LocationView } from './routes/LocationView';
import { Recipes } from './routes/Recipes';
import { Checklists } from './routes/Checklists';
import { History } from './routes/History';
import { Expiring } from './routes/Expiring';
import { Faults } from './routes/Faults';
import { FaultsHistory } from './routes/FaultsHistory';
import { Documents } from './routes/Documents';
import { DocumentsHistory } from './routes/DocumentsHistory';
import { Settings } from './routes/Settings';
import { SyncDiagnostics } from './routes/SyncDiagnostics';
import { t } from '@/text';

// HashRouter: funciona en hosting estàtic (Cloudflare/GitHub Pages) sense config de
// reescriptura de rutes al servidor.
const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'cook', element: <CookMenu /> },
      { path: 'measure', element: <MeasureMenu /> },
      { path: 'resources/:kind', element: <ResourceDetail /> },
      { path: 'guide', element: <Guide /> },
      { path: 'guide/new', element: <GuideEditor /> },
      { path: 'guide/edit/:id', element: <GuideEditor /> },
      { path: 'purchase', element: <PurchaseFlow /> },
      { path: 'shopping', element: <ShoppingList /> },
      { path: 'shopping/history', element: <ShoppingHistory /> },
      { path: 'objects', element: <ObjectsList /> },
      { path: 'objects/recipes', element: <Recipes /> },
      { path: 'recipes', element: <Recipes /> },
      { path: 'locations', element: <LocationsList /> },
      { path: 'locations/room/:room', element: <RoomView /> },
      { path: 'locations/:id', element: <LocationView /> },
      { path: 'checklists', element: <Checklists /> },
      { path: 'history', element: <History /> },
      { path: 'expiring', element: <Expiring /> },
      { path: 'faults', element: <Faults /> },
      { path: 'faults/history', element: <FaultsHistory /> },
      { path: 'documents', element: <Documents /> },
      { path: 'documents/history', element: <DocumentsHistory /> },
      { path: 'settings', element: <Settings /> },
      { path: 'settings/diagnostics', element: <SyncDiagnostics /> },
    ],
  },
]);

function Gate() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-boat-50 text-boat-700">
        {t.common.loading}
      </div>
    );
  }
  return authenticated ? <RouterProvider router={router} /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <ImageViewerProvider>
          <Gate />
        </ImageViewerProvider>
      </SyncProvider>
    </AuthProvider>
  );
}
