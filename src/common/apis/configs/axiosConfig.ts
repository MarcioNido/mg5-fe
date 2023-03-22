import axios from 'axios';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

// initializing the axios instance with custom configs
export const api = axios.create({
    baseURL: baseUrl,
});

// defining a custom error handler for all APIs
const errorHandler = (error: { response: { status: any; }; }) => {
    const statusCode = error.response?.status

    // logging only errors that are not 401
    if (statusCode && statusCode !== 401) {
        console.error(error)
    }

    return Promise.reject(error)
}

// registering the custom error handler to the
// "api" axios instance
api.interceptors.response.use(undefined, (error) => errorHandler(error))
