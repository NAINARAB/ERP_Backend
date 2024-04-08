function success (res, message, data) {
    return res.status(200).json({data: data || [] , message: message || 'Done!', success: true});
}

function dataFound(res, data, message) {
    return res.status(200).json({ data: data || [], message: message || 'Data Found', success: true });
}

function noData(res, message) {
    return res.status(200).json({ data: [], success: true, message: message || 'No data' })
}

function falied(res, message) {
    return res.status(400).json({ data: [], message: message || 'Something Went Wrong! Please Try Again', success: false })
}

function servError(e, res, message) {
    console.log(e);
    return res.status(500).json({ data: [], success: false, message: message || "Server error" })
}

function invalidInput(res, message) {
    return res.status(400).json({ data: [], success: false, message: message || 'Invalid request' })
}


export {
    success,
    dataFound,
    noData,
    falied,
    servError,
    invalidInput
}