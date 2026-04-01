import { PageLayout } from './ui/components/PageLayout';
import { ErrorBoundary } from './ui/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <PageLayout />
    </ErrorBoundary>
  );
}
