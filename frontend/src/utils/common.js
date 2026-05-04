/**
 * 判断一个名称是否应被视为“启用列表分组标题”。
 * 目前兼容两种写法：
 * 1. `=标题=`
 * 2. 斜杠星号包裹标题，例如注释风格标题
 *
 * 这样既兼容旧的等号包裹方案，也兼容部分用户使用注释风格名称
 * 来做纯标题模组的习惯，避免折叠功能只认单一格式。
 */
export const isSectionHeaderTitle = (value = '') => {
  const name = String(value ?? '').trim()
  if (!name) return false

  const isEqualsWrapped = name.length >= 2 && name.startsWith('=') && name.endsWith('=')
  const isCommentWrapped = name.length >= 4 && name.startsWith('/*') && name.endsWith('*/')

  return isEqualsWrapped || isCommentWrapped
}
