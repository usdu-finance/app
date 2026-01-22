import React from 'react';
import { ApolloProvider as ApolloProviderBase, ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { INDEXER_URL } from '../constants';

const httpLink = createHttpLink({
	uri: INDEXER_URL || 'https://indexer.usdu.finance',
});

const client = new ApolloClient({
	link: httpLink,
	cache: new InMemoryCache(),
	defaultOptions: {
		watchQuery: {
			fetchPolicy: 'cache-and-network',
			nextFetchPolicy: 'cache-first',
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
