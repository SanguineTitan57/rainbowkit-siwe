'use client'; // Indicates that this file is part of a client-side React component
import { useMemo, ReactNode, useState, useEffect } from 'react'; // Importing React hooks
import '@rainbow-me/rainbowkit/styles.css'; // Importing RainbowKit's CSS for styling
import {
  getDefaultConfig, // Function to get the default configuration for RainbowKit
  RainbowKitProvider, // Provider component for RainbowKit to manage wallet connections
  createAuthenticationAdapter, // Function to create a custom authentication adapter
  RainbowKitAuthenticationProvider, // Provider component to handle authentication state in RainbowKit
  AuthenticationStatus, // Type for managing authentication status
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi'; // Provider for Wagmi, a library for Ethereum hooks
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
} from 'wagmi/chains'; // Importing different blockchain networks (chains)
import {
  QueryClientProvider, // Provider for React Query to manage server state
  QueryClient,
} from "@tanstack/react-query"; // Importing React Query client for API data management
import { SiweMessage } from 'siwe'; // Importing the SIWE (Sign-In with Ethereum) message class

// Default configuration for RainbowKit, including app name, project ID, and supported chains
const config = getDefaultConfig({
    appName: 'My RainbowKit App', // Name of the application
    projectId: 'YOUR_PROJECT_ID', // Project ID for the RainbowKit app
    chains: [mainnet, polygon, optimism, arbitrum, base], // Supported blockchain networks
    ssr: true, // Enable server-side rendering (SSR) for the dApp
  });

const queryClient = new QueryClient(); // Creating a new QueryClient instance for React Query

interface ProvidersProps {
  children: ReactNode; // Type definition for children prop, allowing any React node
};

// Providers component that wraps its children with various providers for managing state, authentication, etc.
const Providers: React.FC<ProvidersProps> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>("loading"); // State to manage authentication status. understand that Authentication status has 3 states: loading || authenticated || unauthenticated. || is the symbol for the word 'or'. Test it out and see.

  useEffect(() => { // useEffect to run on component mount
    const fetchUser = async () => { // Async function to fetch the current user's address from the server
      try {
        const response = await fetch('http://localhost:8080/me'); // Fetch request to get the user's address
        const { address } = await response.json(); // Extracting the address from the response
        console.log('Address', address); // Logging the address to the console
        setAuthStatus(address ? 'authenticated' : 'unauthenticated'); // Setting auth status based on the presence of an address
      } catch (error) { // Error handling. A good developer must have error handling.
        console.log('Error', error); // Logging any errors that occur
      }
    };
    fetchUser(); // Call fetchUser to get the user's address on component mount

    window.addEventListener('focus', fetchUser); // Add an event listener to refetch the user when the window gains focus

    return () => {
      window.removeEventListener('focus', fetchUser); // Clean up the event listener on component unmount
    };
  }, []);

  // useMemo to create an authentication adapter for SIWE, ensure that it is defined withing a function, in this case, it's placed inside the main Providers function. If you move useMemo above const Providers: React.FC.. you get an error 
  const authAdapter = useMemo(() => {
    return createAuthenticationAdapter({
      getNonce: async () => { // Function to get a nonce from the server
        const response = await fetch('http://localhost:8080/nonce'); // Fetching nonce from the server
        const { nonce } = await response.json(); // Extracting nonce from the response
        return nonce; // Returning the nonce
      },
      createMessage: ({ nonce, address, chainId }) => { // Function to create a SIWE message
        return new SiweMessage({ // Creating a new SiweMessage instance
          domain: window.location.host, // Setting the domain to the current host
          address, // Ethereum address to be authenticated
          statement: 'Sign in to prove that you own this wallet. This transaction does not cost any gas.', // Custom statement for the message. You can change it to whatever.
          uri: window.location.origin, // URI of the current location
          version: '1', // SIWE version
          chainId, // ID of the blockchain network
          nonce, // Nonce obtained from the server
        });
      },
      getMessageBody: ({ message }) => { // Function to prepare the message for signing
        return message.prepareMessage(); // Returning the prepared message
      },
      verify: async ({ message, signature }) => { // Function to verify the signature with the server
        const verifyRes = await fetch('http://localhost:8080/verify', {
          method: 'POST', // Using POST method for the request
          headers: { 'Content-Type': 'application/json' }, // Setting headers for JSON content
          body: JSON.stringify({ message, signature }), // Sending the message and signature in the request body
        });

        return Boolean(verifyRes.ok); // Returning true if the verification was successful
      },
      signOut: async () => { // Function to sign out the user
        console.log('Signing Out'); // Logging the sign-out action, check browser console
        await fetch('http://localhost:8080/logout'); // Sending a request to the server to log out
      },
    });
  }, []);

  // Returning the providers that wrap around the children components
  return (
    <WagmiProvider config={config}> {/* Providing the Wagmi context */}
      <QueryClientProvider client={queryClient}> {/* Providing the React Query context */}
        <RainbowKitAuthenticationProvider
          adapter={authAdapter} // Providing the authentication adapter
          status={authStatus} // Setting the authentication status
          // status='authenticated' // Optional manual override for authentication status. Remember AuthenticationStatus having 3 states of loading, authenticated and unauthenticated? Well you can change the value of status to one of the 3, just remember to change it back to authStatus.
        >
          <RainbowKitProvider> {/* Providing the RainbowKit context */}
            {children} {/* Rendering the children components */}
          </RainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Providers; // Exporting the Providers component as default
