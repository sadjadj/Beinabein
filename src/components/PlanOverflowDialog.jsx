import React from 'react';
import { formatCurrency } from '@/lib/stats';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

// payload: { amount, max, donation } | null
export default function PlanOverflowDialog({ payload, onAccept, onClose }) {
  const surplus = payload ? (Number(payload.amount) || 0) - (Number(payload.max) || 0) : 0;
  const newDonation = payload ? surplus + (Number(payload.donation) || 0) : 0;
  return (
    <AlertDialog open={!!payload} onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <AlertDialogContent className="text-center">
        <AlertDialogHeader className="text-center">
          <AlertDialogTitle className="text-center">مبلغ فاکتور بیش از کران بالای قیمت است</AlertDialogTitle>
          <AlertDialogDescription className="text-center block leading-relaxed">
            مبلغ فاکتور ({formatCurrency(payload?.amount || 0)}) از کران بالای قیمت ({formatCurrency(payload?.max || 0)}) بیشتر است.
            مبلغ مازاد ({formatCurrency(surplus)}) با دونیشن جمع می‌شود و مبلغ فاکتور به {formatCurrency(payload?.max || 0)} کاهش می‌یابد.
            <br />دونیشن جدید: {formatCurrency(newDonation)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
          <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
          <AlertDialogAction onClick={onAccept} className="bg-[#B74B40] hover:bg-[#A03D34] text-white mx-2">
            پذیرفتن
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}