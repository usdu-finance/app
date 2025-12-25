import React from 'react';
import {
	ApolloProvider as ApolloProviderBase,
	ApolloClient,
	InMemoryCache,
	createHttpLink,
} from '@apollo/client';

const httpLink = createHttpLink({
	uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'https://ponder.usdu.finance',
});

const client = new ApolloClient({
	link: httpLink,
	cache: new InMemoryCache(),
	defaultOptions: {
		watchQuery: {
			errorPolicy: 'all',
		},
		query: {
			errorPolicy: 'all',
		},
	},
});

interface ApolloProviderProps {
	children: React.ReactNode;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
	return <ApolloProviderBase client={client}>{children}</ApolloProviderBase>;
}
