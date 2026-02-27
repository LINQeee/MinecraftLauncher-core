const { request } = require('undici')
const { v3 } = require('uuid')

let uuid
let api_url = 'https://authserver.mojang.com'

const post = async (path, body) => {
  const { statusCode, body: resBody } = await request(api_url + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })

  const data = await resBody.json().catch(() => null)
  return { statusCode, data }
}

module.exports.getAuth = async (username, password, client_token = null) => {
  getUUID(username)

  if (!password) {
    return {
      access_token: uuid,
      client_token: client_token || uuid,
      uuid,
      name: username,
      user_properties: '{}'
    }
  }

  const { data, statusCode } = await post('/authenticate', {
    agent: { name: 'Minecraft', version: 1 },
    username,
    password,
    clientToken: uuid,
    requestUser: true
  })

  if (!data || !data.selectedProfile) { throw new Error('Validation error: ' + statusCode) }

  return {
    access_token: data.accessToken,
    client_token: data.clientToken,
    uuid: data.selectedProfile.id,
    name: data.selectedProfile.name,
    selected_profile: data.selectedProfile,
    user_properties: parsePropts(data.user.properties)
  }
}

module.exports.validate = async (accessToken, clientToken) => {
  const { data } = await post('/validate', { accessToken, clientToken })
  if (!data) return true
  throw data
}

module.exports.refreshAuth = async (accessToken, clientToken) => {
  const { data, statusCode } = await post('/refresh', {
    accessToken,
    clientToken,
    requestUser: true
  })

  if (!data || !data.selectedProfile) { throw new Error('Validation error: ' + statusCode) }

  return {
    access_token: data.accessToken,
    client_token: getUUID(data.selectedProfile.name),
    uuid: data.selectedProfile.id,
    name: data.selectedProfile.name,
    user_properties: parsePropts(data.user.properties)
  }
}

module.exports.invalidate = async (accessToken, clientToken) => {
  const { data } = await post('/invalidate', { accessToken, clientToken })
  if (!data) return true
  throw data
}

module.exports.signOut = async (username, password) => {
  const { data } = await post('/signout', { username, password })
  if (!data) return true
  throw data
}

module.exports.changeApiUrl = url => {
  api_url = url
}

const parsePropts = array => {
  if (!array) return '{}'
  const obj = {}
  for (const { name, value } of array) { obj[name] = obj[name] ? [...obj[name], value] : [value] }
  return JSON.stringify(obj)
}

const getUUID = value => {
  if (!uuid) uuid = v3(value, v3.DNS)
  return uuid
}
