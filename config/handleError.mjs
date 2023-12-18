const ServerError = (e, api, method, res) => {
    console.log(`Error in ${api ?? 'unknown API'} ${method ?? 'unknown method'}: `, e);
    res.status(500).json({ message: 'Internal Server Error', status: 'Failure', data: [] });
}

export default ServerError;