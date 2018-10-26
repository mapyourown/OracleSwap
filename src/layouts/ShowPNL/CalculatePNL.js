
export function calculatePNL( ethStart,
		ethFinal,
		assetStart,
		assetFinal,
		marginRate,
		requiredMargin,
		leverageRatio,
		basis,
		side) {
	var leveragedEth = requiredMargin * leverageRatio / 1e6
	var ethRatio = ethFinal / ethStart
	var assetRatio = assetFinal / assetStart

	var CFDReturn = assetRatio - 1 - basis/1e4

	var lpPNL
	console.log(assetRatio)
	console.log(leveragedEth)
	console.log(ethRatio)
	console.log(CFDReturn)
	if (side) // maker is long taker gets Short Rate
		lpPNL = leveragedEth * (CFDReturn + marginRate/1e4) / ethRatio
	else
		lpPNL = leveragedEth * ((-1.0 * CFDReturn) + marginRate/1e4) / ethRatio

	if (lpPNL > requiredMargin)
      lpPNL = requiredMargin
    if (lpPNL < -1.0 * requiredMargin)
      lpPNL = -1.0 * requiredMargin

	return lpPNL
}