

function dataFound(res, data, message) {
    return res.status(200).json({ data: data, message: message || 'Data Found', status: 'Success' });
}

function noData(res, message) {
    return res.status(200).json({ data: [], status: 'Success', message: message || 'No data' })
}

function falied(res, message) {
    return res.status(400).json({ data: [], message: message || 'Something Went Wrong! Please Try Again', status: "Failure" })
}

function servError(e, res, message) {
    console.log(e);
    return res.status(500).json({ data: [], status: "Failure", message: message || "Server error" })
}

function invalidInput(res, message) {
    return res.status(400).json({ data: [], status: "Failure", message: message || 'Invalid request' })
}


module.exports = {
    dataFound,
    noData,
    falied,
    servError,
    invalidInput
}