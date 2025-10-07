import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { getClientId, clearClientId } from '@/lib/clientId';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MigrationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MigrationModal({ open, onClose, onSuccess }: MigrationModalProps) {
  const [migrating, setMigrating] = useState(false);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const clientId = getClientId();
      
      const { data, error } = await supabase.functions.invoke('migrate-guest-requests', {
        body: { clientId },
      });

      if (error) throw error;

      if (data.migratedCount > 0) {
        toast.success(`Successfully migrated ${data.migratedCount} site pack(s)!`);
        clearClientId(); // Clear the client ID now that requests are migrated
        onSuccess();
      } else {
        toast.info('No guest site packs found to migrate');
      }
      
      onClose();
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Failed to migrate site packs');
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    // User chose to skip migration
    clearClientId(); // Clear client ID to prevent showing modal again
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Your Guest Site Packs</DialogTitle>
          <DialogDescription>
            We found site packs you created before signing in. Would you like to import them to
            your account? This will allow you to access them from any device.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Your previous site packs will be linked to your account and synced across all your
            devices.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={migrating}
          >
            Skip
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={migrating}
            variant="hero"
          >
            {migrating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Site Packs'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
