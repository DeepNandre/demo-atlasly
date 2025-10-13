import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ValidationResult {
  status: 'pass' | 'warning' | 'fail';
  quality_score: number;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    details?: any;
  }>;
  metrics: Record<string, any>;
}

export function useExportValidation() {
  const [validating, setValidating] = useState(false);

  const validateExport = async (
    siteRequestId: string,
    fileType: string,
    fileContent: string
  ): Promise<ValidationResult | null> => {
    setValidating(true);
    try {
      console.log(`🔍 Validating ${fileType} export...`);

      const { data, error } = await supabase.functions.invoke('validate-exports', {
        body: {
          site_request_id: siteRequestId,
          file_type: fileType,
          file_content: fileContent,
        },
      });

      if (error) {
        console.error('Validation error:', error);
        toast.error(`Failed to validate ${fileType}: ${error.message}`);
        return null;
      }

      const result = data as ValidationResult;

      // Show toast based on status
      if (result.status === 'fail') {
        toast.error(`${fileType.toUpperCase()} validation failed (score: ${result.quality_score})`, {
          description: `${result.issues.length} issue(s) found`,
        });
      } else if (result.status === 'warning') {
        toast.warning(`${fileType.toUpperCase()} has minor issues (score: ${result.quality_score})`, {
          description: `${result.issues.length} warning(s)`,
        });
      } else {
        toast.success(`${fileType.toUpperCase()} validated successfully`, {
          description: `Quality score: ${result.quality_score}/100`,
        });
      }

      return result;
    } catch (error: any) {
      console.error('Validation exception:', error);
      toast.error('Validation failed', {
        description: error.message,
      });
      return null;
    } finally {
      setValidating(false);
    }
  };

  const getValidationResults = async (siteRequestId: string) => {
    try {
      const { data, error } = await supabase
        .from('export_quality_checks' as any)
        .select('*')
        .eq('site_request_id', siteRequestId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('Failed to fetch validation results:', error);
      return [];
    }
  };

  return {
    validateExport,
    getValidationResults,
    validating,
  };
}
