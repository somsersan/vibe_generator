'use client';

import { useState } from 'react';
import { CareerTree, CareerPathNode } from '@/types/profession';

interface CareerTreeProps {
  careerTree: CareerTree;
}

export default function CareerTreeComponent({ careerTree }: CareerTreeProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  if (!careerTree || !careerTree.currentRole) {
    return (
      <div className="rounded-2xl border border-hh-gray-200 bg-hh-gray-50 p-6 text-center text-text-secondary">
        Данные о карьерном пути загружаются...
      </div>
    );
  }

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700 border-green-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    hard: 'bg-red-100 text-red-700 border-red-300',
  };

  const typeLabels = {
    vertical: 'Вертикальный рост',
    horizontal: 'Горизонтальное развитие',
    alternative: 'Альтернативный путь',
    current: 'Текущая позиция',
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vertical':
        return 'border-blue-400 bg-blue-50';
      case 'horizontal':
        return 'border-purple-400 bg-purple-50';
      case 'alternative':
        return 'border-orange-400 bg-orange-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Текущая роль - корень дерева */}
      <div className="relative">
        <div className="rounded-2xl border-2 border-hh-red bg-gradient-to-br from-hh-red/10 to-hh-red/5 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-hh-red px-3 py-1 text-xs font-semibold text-white">
                Текущая позиция
              </div>
              <h3 className="text-xl font-bold text-text-primary">{careerTree.currentRole.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">Уровень: {careerTree.currentRole.level}</p>
              
              {careerTree.currentRole.skills && careerTree.currentRole.skills.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">Текущие навыки:</p>
                  <div className="flex flex-wrap gap-2">
                    {careerTree.currentRole.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-text-primary border border-hh-gray-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Линии от корня к путям */}
        {careerTree.paths && careerTree.paths.length > 0 && (
          <div className="absolute left-1/2 top-full mt-4 h-8 w-px -translate-x-1/2 bg-hh-gray-200" />
        )}
      </div>

      {/* Пути развития */}
      {careerTree.paths && careerTree.paths.length > 0 && (
        <div className="pt-8">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Возможные пути развития
          </h4>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {careerTree.paths.map((path: CareerPathNode) => {
              const isSelected = selectedPath === path.id;
              const isHovered = hoveredSkill && path.skillsRequired?.includes(hoveredSkill);

              return (
                <div
                  key={path.id}
                  className={`group relative rounded-2xl border-2 p-5 transition-all cursor-pointer ${
                    isSelected || isHovered
                      ? `${getTypeColor(path.type)} shadow-lg scale-105`
                      : 'border-hh-gray-200 bg-white hover:border-hh-red hover:shadow-md'
                  }`}
                  onClick={() => setSelectedPath(isSelected ? null : path.id)}
                >
                  {/* Заголовок пути */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${
                          difficultyColors[path.difficulty]
                        }`}>
                          {path.difficulty === 'easy' ? 'Легко' : path.difficulty === 'medium' ? 'Средне' : 'Сложно'}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {typeLabels[path.type] || path.type}
                        </span>
                      </div>
                      <h5 className="text-base font-bold text-text-primary">{path.title}</h5>
                      {path.description && (
                        <p className="mt-1 text-sm text-text-secondary">{path.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Детали пути */}
                  {isSelected && (
                    <div className="mt-4 space-y-3 border-t border-hh-gray-200 pt-4">
                      {/* Навыки для развития */}
                      {path.skillsRequired && path.skillsRequired.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Навыки для развития:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {path.skillsRequired.map((skill, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-full bg-hh-blue/10 px-3 py-1 text-xs font-medium text-hh-blue border border-hh-blue/20"
                                onMouseEnter={() => setHoveredSkill(skill)}
                                onMouseLeave={() => setHoveredSkill(null)}
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Время и зарплата */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-hh-gray-50 p-2">
                          <p className="text-xs text-text-secondary">Время</p>
                          <p className="text-sm font-semibold text-text-primary">{path.timeToReach}</p>
                        </div>
                        <div className="rounded-xl bg-hh-gray-50 p-2">
                          <p className="text-xs text-text-secondary">Зарплата</p>
                          <p className="text-sm font-semibold text-text-primary">{path.salaryRange}</p>
                        </div>
                      </div>

                      {/* Вакансии */}
                      {path.vacancies !== undefined && (
                        <div className="rounded-xl bg-green-50 p-2 border border-green-200">
                          <p className="text-xs text-green-700">Вакансий на hh.ru</p>
                          <p className="text-sm font-semibold text-green-800">
                            {path.vacancies.toLocaleString('ru-RU')}
                          </p>
                        </div>
                      )}

                      {/* Преимущества */}
                      {path.benefits && path.benefits.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Что дает этот путь:
                          </p>
                          <ul className="space-y-1">
                            {path.benefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
                                <span className="mt-1 text-hh-red">✓</span>
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Связанные профессии */}
                      {path.relatedProfessions && path.relatedProfessions.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Связанные профессии:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {path.relatedProfessions.map((prof, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-full bg-hh-gray-100 px-3 py-1 text-xs text-text-primary"
                              >
                                {prof}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Реальные навыки из вакансий (если есть) */}
                      {path.skills && path.skills.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Навыки для этой роли:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {path.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 border border-purple-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Превью при наведении (если не выбрано) */}
                  {!isSelected && (
                    <div className="mt-3 flex items-center justify-between text-xs text-text-secondary">
                      <span>{path.timeToReach}</span>
                      {path.vacancies !== undefined && (
                        <span className="font-medium text-green-600">
                          {path.vacancies.toLocaleString('ru-RU')} вакансий
                        </span>
                      )}
                    </div>
                  )}

                  {/* Иконка для индикации кликабельности */}
                  <div className="absolute right-3 top-3 text-hh-gray-300 group-hover:text-hh-red transition-colors">
                    {isSelected ? '▼' : '▶'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Дерево навыков (опционально) */}
      {careerTree.skillTree && careerTree.skillTree.skills && careerTree.skillTree.skills.length > 0 && (
        <div className="mt-8 rounded-2xl border border-hh-gray-200 bg-white p-6">
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Ключевые навыки и их влияние
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {careerTree.skillTree.skills.map((skill) => (
              <div
                key={skill.id}
                className={`rounded-xl border p-4 transition-colors ${
                  hoveredSkill === skill.name
                    ? 'border-hh-blue bg-hh-blue/5'
                    : 'border-hh-gray-200 bg-hh-gray-50'
                }`}
                onMouseEnter={() => setHoveredSkill(skill.name)}
                onMouseLeave={() => setHoveredSkill(null)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-text-primary">{skill.name}</span>
                  <span className="text-xs text-text-secondary">Уровень: {skill.level}%</span>
                </div>
                {skill.description && (
                  <p className="text-sm text-text-secondary">{skill.description}</p>
                )}
                {skill.opensRoles && skill.opensRoles.length > 0 && (
                  <div className="mt-2 text-xs text-text-secondary">
                    Открывает: {skill.opensRoles.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

