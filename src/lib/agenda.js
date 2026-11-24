import { agenda } from '../config/site.js'
import { paraISO, deISO } from './formatadores.js'

/** Data mínima selecionável: hoje. */
export const dataMinima = () => paraISO(new Date())

/** Data máxima selecionável, conforme `agenda.diasDeAntecedenciaMax`. */
export function dataMaxima() {
  const d = new Date()
  d.setDate(d.getDate() + agenda.diasDeAntecedenciaMax)
  return paraISO(d)
}

/** A loja abre nesse dia da semana? */
export function diaAberto(iso) {
  if (!iso) return false
  return !agenda.diasFechados.includes(deISO(iso).getDay())
}

/** Hora de fechamento do dia (sábado costuma encerrar antes). */
function fechamentoDoDia(iso) {
  const ehSabado = deISO(iso).getDay() === 6
  return ehSabado ? (agenda.sabadoFechaAs ?? agenda.horaFechamento) : agenda.horaFechamento
}

/**
 * Gera os horários do dia ('08:00', '08:30', ...).
 * Horários que já passaram (quando a data é hoje) são descartados.
 */
export function horariosDoDia(iso) {
  if (!iso || !diaAberto(iso)) return []

  const fim = fechamentoDoDia(iso)
  const agoraISO = paraISO(new Date())
  const ehHoje = iso === agoraISO
  const minutosAgora = new Date().getHours() * 60 + new Date().getMinutes()

  const slots = []
  for (let min = agenda.horaAbertura * 60; min < fim * 60; min += agenda.intervaloMinutos) {
    if (ehHoje && min <= minutosAgora + 30) continue // precisa de 30 min de antecedência
    const h = String(Math.floor(min / 60)).padStart(2, '0')
    const m = String(min % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}
