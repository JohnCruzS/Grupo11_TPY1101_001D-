import { AuditLogViewer } from './AuditLogViewer';

interface AuditSectionProps {
  userId?: string;
  enterpriseId?: string;
}

export function AuditSection({ userId, enterpriseId }: AuditSectionProps) {
  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <AuditLogViewer
        userId={userId}
        enterpriseId={enterpriseId}
        showTitle={true}
        maxHeight="calc(100vh - 250px)"
      />
    </div>
  );
}
