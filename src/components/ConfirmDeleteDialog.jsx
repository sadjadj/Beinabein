import React from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function ConfirmDeleteDialog({
  open,
  onConfirm,
  onClose,
  title = 'حذف ثبت‌نام',
  description = 'آیا از حذف این ثبت‌نام اطمینان دارید؟ این عملیات قابل بازگشت نیست.'
}) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="text-center">
        <AlertDialogHeader className="text-center">
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center block">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
          <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white mx-2">حذف</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}