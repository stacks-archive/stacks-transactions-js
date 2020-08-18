const fetchMock = require('jest-fetch-mock');
jest.setMock('cross-fetch', fetchMock);
fetchMock.enableFetchMocks();