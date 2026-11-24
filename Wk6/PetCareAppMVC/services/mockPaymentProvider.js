const outcomes = ['APPROVED', 'PENDING', 'DECLINED'];

exports.createPayment = async (request) => {
  const status = outcomes.includes(request.testStatus)
    ? request.testStatus
    : outcomes[Math.floor(Math.random() * outcomes.length)];

  return {
    providerPaymentId: `mock_${Date.now()}`,
    merchantReference: request.merchantReference,
    status
  };
};
