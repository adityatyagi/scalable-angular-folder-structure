import {
  FormControl,
  FormGroup,
  FormArray,
  AbstractControl
} from '@angular/forms';

// email pattern - /(^[a-zA-Z0-9_\.\+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-\.]+$)/
// phone pattern - /[+]?[0-9]{0,13}$/

export function noWhitespaceValidator(control: FormControl) {
  const isWhitespace = (control.value || '').trim().length === 0;
  const isValid = !isWhitespace;
  return isValid ? null : { whitespace: true };
}

export function passwordMatchValidator(control: FormGroup) {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  return password && confirmPassword && password.value !== confirmPassword.value
    ? { passwordmatchfailed: true }
    : null;
}

export function openLinkInNewTab(link: string) {
  let url = '';
  if (!/^http[s]?:\/\//.test(link)) {
    url += 'http://';
  }
  url += link;
  window.open(url, '_blank');
}

export function validateAllFormFields(formGroup: FormGroup | FormArray) {
  Object.keys(formGroup.controls).forEach(field => {
    const control = formGroup.get(field);
    if (control instanceof FormControl) {
      control.markAsTouched({ onlySelf: true });
    } else if (control instanceof FormGroup || control instanceof FormArray) {
      validateAllFormFields(control);
    }
  });
}

export function blankSpaceInputNotValid(control: AbstractControl) {
  if (control && control.value && !control.value.replace(/\s/g, '').length) {
    control.setValue('');
  }
  return null;
}

export function numbersOnly(control: AbstractControl) {
  const val = control.value;

  if (val === null || val === '') {
    return null;
  }

  if (!val.toString().match(/^[0-9]+(\.?[0-9]+)?$/)) {
    return { onlyNumber: true };
  }

  return null;
}
