
export function calculatePNL( ethStart,
		ethFinal,
		assetStart,
		assetFinal,
		longRate,
		shortRate,
		requiredMargin,
		leverageRatio,
		basis,
		side) {
	var leveragedEth = requiredMargin * leverageRatio / 1e6
	var ethRatio = ethFinal / ethStart
	var assetRatio = assetFinal / assetStart

	var CFDReturn = assetRatio - 1 - basis/1e4

	var lpPNL
	/*console.log(assetRatio)
	console.log(leveragedEth)
	console.log(ethRatio)
	console.log(CFDReturn)*/
	if (side)
		lpPNL = leveragedEth * (CFDReturn + longRate/1e4) / ethRatio
	else
		lpPNL = leveragedEth * ((-1.0 * CFDReturn) + shortRate/1e4) / ethRatio



	if (lpPNL > requiredMargin)
      lpPNL = requiredMargin
    if (lpPNL < -1.0 * requiredMargin)
      lpPNL = -1.0 * requiredMargin

	return lpPNL
}