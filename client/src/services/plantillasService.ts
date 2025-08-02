import { supabase } from './supabaseClient';

// Función para obtener el contexto de loading
const getLoadingContext = () => {
  // Intentar obtener el contexto de loading si está disponible
  try {
    const { useLoading } = require('@/contexts/LoadingContext');
    return useLoading();
  } catch {
    // Si no está disponible, retornar funciones vacías
    return {
      startLoading: () => {},
      stopLoading: () => {}
    };
  }
};

export interface Plantilla {
  id: number;
  nombre: string;
  descripcion?: string;
  estructura_formulario?: any;
  es_default?: boolean;
  activa?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Obtiene todas las plantillas de solicitudes
 */
export const getAllPlantillas = async (): Promise<Plantilla[]> => {
  const { startLoading, stopLoading } = getLoadingContext();
  
  try {
    startLoading();
    const { data, error } = await supabase
      .from('plantillas_solicitudes')
      .select('*')
      .eq('activa', true)
      .order('nombre');

    if (error) {
      console.error('Error al obtener plantillas:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getAllPlantillas:', error);
    return [];
  } finally {
    stopLoading();
  }
};

/**
 * Verifica la estructura de la base de datos y lista las tablas disponibles
 */
export const verificarEstructuraDB = async () => {
  try {
    console.log('🔍 Verificando estructura de la base de datos...');
    
    // Intentar obtener información de las tablas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('❌ Error al obtener tablas:', tablesError);
      return;
    }

    console.log('📋 Tablas disponibles:', tables?.map(t => t.table_name) || []);
    
    // Verificar si existe la tabla empresas_plantillas
    const empresasPlantillasExists = tables?.some(t => t.table_name === 'empresas_plantillas');
    console.log('✅ Tabla empresas_plantillas existe:', empresasPlantillasExists);
    
    // Verificar si existe la tabla plantillas_solicitudes
    const plantillasSolicitudesExists = tables?.some(t => t.table_name === 'plantillas_solicitudes');
    console.log('✅ Tabla plantillas_solicitudes existe:', plantillasSolicitudesExists);
    
    return {
      empresasPlantillasExists,
      plantillasSolicitudesExists,
      tables: tables?.map(t => t.table_name) || []
    };
  } catch (error) {
    console.error('❌ Error al verificar estructura DB:', error);
    return null;
  }
};

/**
 * Obtiene todas las plantillas activas (fallback)
 */
export const getAllPlantillasActivas = async (): Promise<Plantilla[]> => {
  const { startLoading, stopLoading } = getLoadingContext();
  
  try {
    startLoading();
    console.log('🔄 Obteniendo todas las plantillas activas...');
    
    const { data: plantillas, error } = await supabase
      .from('plantillas_solicitudes')
      .select('*')
      .eq('activa', true)
      .order('nombre');

    if (error) {
      console.error('❌ Error al obtener plantillas activas:', error);
      return [];
    }

    console.log('✅ Plantillas activas obtenidas:', plantillas?.length || 0);
    return plantillas || [];
  } catch (error) {
    console.error('❌ Error en getAllPlantillasActivas:', error);
    return [];
  } finally {
    stopLoading();
  }
};

/**
 * Obtiene las plantillas asociadas a una empresa específica
 */
export const getPlantillasByEmpresa = async (empresaId: number): Promise<Plantilla[]> => {
  const { startLoading, stopLoading } = getLoadingContext();
  
  try {
    startLoading();
    console.log('🔍 Buscando plantillas para empresa ID:', empresaId);
    
    // Primero verificamos si existe la tabla empresas_plantillas
    const { data: tableExists, error: tableError } = await supabase
      .from('empresas_plantillas')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('❌ Error al verificar tabla empresas_plantillas:', tableError);
      console.log('🔄 Intentando obtener todas las plantillas activas...');
      
      // Si no existe la tabla, obtenemos todas las plantillas activas
      return await getAllPlantillasActivas();
    }

    // Si la tabla existe, obtenemos las plantillas asignadas a la empresa
    console.log('📋 Tabla empresas_plantillas existe, buscando asignaciones...');
    const { data: plantillasAsignadas, error: errorAsignadas } = await supabase
      .from('empresas_plantillas')
      .select('plantilla_id')
      .eq('empresa_id', empresaId);

    if (errorAsignadas) {
      console.error('❌ Error al obtener plantillas asignadas:', errorAsignadas);
      return await getAllPlantillasActivas();
    }

    console.log('📊 Plantillas asignadas encontradas:', plantillasAsignadas?.length || 0);
    console.log('📋 Datos de plantillas asignadas:', plantillasAsignadas);

    // Si no hay plantillas asignadas, obtenemos todas las plantillas activas
    if (!plantillasAsignadas || plantillasAsignadas.length === 0) {
      console.log('⚠️ No hay plantillas asignadas para la empresa ID:', empresaId);
      console.log('🔄 Obteniendo todas las plantillas activas como fallback...');
      return await getAllPlantillasActivas();
    }

    // Obtenemos los IDs de las plantillas asignadas
    const plantillaIds = plantillasAsignadas.map(pa => pa.plantilla_id);
    console.log('🆔 IDs de plantillas a buscar:', plantillaIds);

    // Obtenemos las plantillas completas
    const { data: plantillas, error } = await supabase
      .from('plantillas_solicitudes')
      .select('*')
      .in('id', plantillaIds)
      .eq('activa', true)
      .order('nombre');

    if (error) {
      console.error('❌ Error al obtener plantillas:', error);
      return await getAllPlantillasActivas();
    }

    console.log('✅ Plantillas obtenidas exitosamente:', plantillas?.length || 0);
    console.log('📋 Plantillas:', plantillas);
    return plantillas || [];
  } catch (error) {
    console.error('❌ Error en getPlantillasByEmpresa:', error);
    return await getAllPlantillasActivas();
  } finally {
    stopLoading();
  }
};

/**
 * Obtiene una plantilla por ID
 */
export const getPlantillaById = async (id: number): Promise<Plantilla | null> => {
  const { startLoading, stopLoading } = getLoadingContext();
  
  try {
    startLoading();
    const { data, error } = await supabase
      .from('plantillas_solicitudes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error al obtener plantilla:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error en getPlantillaById:', error);
    return null;
  } finally {
    stopLoading();
  }
};

/**
 * Crea una nueva plantilla
 */
export const createPlantilla = async (plantilla: Partial<Plantilla>): Promise<Plantilla | null> => {
  const { startLoading, stopLoading } = getLoadingContext();
  
  try {
    startLoading();
    const { data, error } = await supabase
      .from('plantillas_solicitudes')
      .insert([plantilla])
      .select()
      .single();
    
    if (error) {
      console.error('Error al crear plantilla:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error en createPlantilla:', error);
    return null;
  } finally {
    stopLoading();
  }
};

/**
 * Actualiza una plantilla existente
 */
export const updatePlantilla = async (id: number, plantilla: Partial<Plantilla>): Promise<Plantilla | null> => {
  const { startLoading, stopLoading } = getLoadingContext();
  
  try {
    startLoading();
    const { data, error } = await supabase
      .from('plantillas_solicitudes')
      .update({ ...plantilla, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error al actualizar plantilla:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error en updatePlantilla:', error);
    return null;
  } finally {
    stopLoading();
  }
};

/**
 * Elimina una plantilla
 */
export const deletePlantilla = async (id: number): Promise<boolean> => {
  const { startLoading, stopLoading } = getLoadingContext();
  
  try {
    startLoading();
    const { error } = await supabase
      .from('plantillas_solicitudes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error al eliminar plantilla:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error en deletePlantilla:', error);
    return false;
  } finally {
    stopLoading();
  }
};

// Exportar el servicio completo
export const plantillasService = {
  getAll: getAllPlantillas,
  getAllActivas: getAllPlantillasActivas,
  getByEmpresa: getPlantillasByEmpresa,
  getById: getPlantillaById,
  create: createPlantilla,
  update: updatePlantilla,
  delete: deletePlantilla,
  verificarEstructura: verificarEstructuraDB
}; 