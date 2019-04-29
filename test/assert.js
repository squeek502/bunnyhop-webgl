export function equal(firstValue, secondValue) {
  if (firstValue != secondValue)
    throw new Error('Assert failed, ' + firstValue + ' is not equal to ' + secondValue + '.');
}

export function notEqual(firstValue, secondValue) {
  if (firstValue == secondValue)
    throw new Error('Assert failed, ' + firstValue + ' is equal to ' + secondValue + '.');
}

export function closeTo(firstValue, secondValue) {
  let delta = Math.abs(firstValue - secondValue);
  if (delta > 0.01)
    throw new Error('Assert failed, ' + firstValue + ' is not close to ' + secondValue + '.');
}

export function vecsEqual(firstValue, secondValue) {
  if (!firstValue.equalsWithEpsilon(secondValue, 0.01))
    throw new Error('Assert failed, ' + firstValue + ' is not equal to ' + secondValue + '.');
}
