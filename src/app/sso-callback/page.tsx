import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

const SSOCallback = () => {
  return <AuthenticateWithRedirectCallback 
  signInFallbackRedirectUrl="/"
  signUpFallbackRedirectUrl="/"/>;
};

export default SSOCallback;